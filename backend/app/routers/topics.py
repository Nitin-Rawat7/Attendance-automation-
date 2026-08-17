import asyncio
import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.models.student import Student
from app.models.student_topic_progress import StudentTopicProgress
from app.services.whatsapp import send_template_message

router = APIRouter(prefix="/students", tags=["topics"])

TOPIC_TABLES = {
    1: "robotics_topics",
    2: "ai_topics",
    3: "programming_topics",
}

# --- Helpers ---

def fire_whatsapp_notification(to: str, template_name: str, body_parameters: list[str]):
    def send():
        try:
            asyncio.run(
                send_template_message(
                    to=to,
                    template_name=template_name,
                    body_parameters=body_parameters,
                )
            )
            print(f"[whatsapp] {template_name} notification sent successfully")
        except Exception as e:
            print(f"[whatsapp] {template_name} notification failed: {e}")

    threading.Thread(target=send, daemon=True).start()


def get_topic_table(course_id: int) -> str:
    table_name = TOPIC_TABLES.get(course_id)
    if not table_name:
        raise HTTPException(status_code=400, detail="unknown course_id, no topic table mapped")
    return table_name


def get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="student not found")
    return student


# --- Schemas ---

class TopicCreate(BaseModel):
    course_id: int
    name: str


class TopicUpdate(BaseModel):
    name: str


class ProgressStatusUpdate(BaseModel):
    status: str


# --- Student List Endpoint ---

@router.get("/")
def list_all_students(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if course_id:
        query = query.filter(Student.course_id == course_id)
    
    students = query.all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": getattr(s, "email", None),
            "total_classes": getattr(s, "total_classes", 30),
            "attended_classes": getattr(s, "attended_classes", 0),
            "remaining_classes": getattr(s, "remaining_classes", 30),
            "course_id": getattr(s, "course_id", 1),
            "parent_whatsapp": getattr(s, "parent_whatsapp", None),
        }
        for s in students
    ]


# --- Course Topic Management Endpoints ---

@router.get("/course/{course_id}/topics")
def list_course_topics(course_id: int, db: Session = Depends(get_db)):
    table_name = get_topic_table(course_id)
    rows = db.execute(text(f"SELECT id, name FROM {table_name} ORDER BY id ASC")).fetchall()
    return [{"id": r[0], "name": r[1]} for r in rows]


@router.post("/course/{course_id}/add-topic")
def add_topic(course_id: int, payload: TopicCreate, db: Session = Depends(get_db)):
    table_name = get_topic_table(course_id)

    result = db.execute(
        text(f"INSERT INTO {table_name} (name) VALUES (:name) RETURNING id"),
        {"name": payload.name},
    )
    topic_id = result.fetchone()[0]

    students = db.query(Student).filter(Student.course_id == course_id).all()
    for student in students:
        db.add(
            StudentTopicProgress(
                student_id=student.id,
                topic_id=topic_id,
                course_id=course_id,
                status="pending",
            )
        )
    db.commit()

    return {"ok": True, "topic_id": topic_id, "students_linked": len(students)}


@router.put("/course/{course_id}/topics/{topic_id}")
def update_course_topic(course_id: int, topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    table_name = get_topic_table(course_id)
    result = db.execute(
        text(f"UPDATE {table_name} SET name = :name WHERE id = :id"),
        {"name": payload.name, "id": topic_id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"ok": True, "message": "Topic updated"}


@router.delete("/course/{course_id}/topics/{topic_id}")
def delete_course_topic(course_id: int, topic_id: int, db: Session = Depends(get_db)):
    table_name = get_topic_table(course_id)
    
    db.query(StudentTopicProgress).filter(
        StudentTopicProgress.course_id == course_id,
        StudentTopicProgress.topic_id == topic_id
    ).delete()
    
    result = db.execute(text(f"DELETE FROM {table_name} WHERE id = :id"), {"id": topic_id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"ok": True, "message": "Topic deleted"}


# --- Student Progress Endpoints ---

@router.get("/{student_id}/topics")
def list_student_topics(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    table_name = get_topic_table(student.course_id)

    rows = db.execute(
        text(
            f"""
            SELECT stp.id, stp.topic_id, t.name, stp.status
            FROM student_topic_progress stp
            JOIN {table_name} t ON t.id = stp.topic_id
            WHERE stp.student_id = :student_id AND stp.course_id = :course_id
            ORDER BY stp.topic_id
            """
        ),
        {"student_id": student_id, "course_id": student.course_id},
    ).fetchall()

    return [
        {
            "id": row[0],
            "topic_id": row[1],
            "topic_title": row[2] or f"Topic {row[1]}",
            "name": row[2] or f"Topic {row[1]}",
            "status": row[3],
        }
        for row in rows
    ]


@router.put("/topic-progress/{progress_id}")
def update_topic_progress_status(progress_id: int, payload: ProgressStatusUpdate, db: Session = Depends(get_db)):
    progress = db.query(StudentTopicProgress).filter(StudentTopicProgress.id == progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="topic progress record not found")

    progress.status = payload.status
    db.commit()
    return {"ok": True, "status": progress.status}


# --- WhatsApp Template Action Endpoints ---

@router.post("/{student_id}/topics/{topic_id}/complete")
def complete_topic_for_student(student_id: int, topic_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)

    progress = (
        db.query(StudentTopicProgress)
        .filter(
            StudentTopicProgress.student_id == student_id,
            StudentTopicProgress.topic_id == topic_id,
            StudentTopicProgress.course_id == student.course_id,
        )
        .first()
    )

    if not progress:
        raise HTTPException(status_code=404, detail="topic progress record not found for this student")

    table_name = get_topic_table(student.course_id)
    result = db.execute(
        text(f"SELECT name FROM {table_name} WHERE id = :topic_id"),
        {"topic_id": topic_id},
    ).fetchone()

    topic_name = result[0] if result else "this topic"
    progress.status = "completed"
    db.commit()

    if getattr(student, "parent_whatsapp", None):
        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="topic_complete",
            body_parameters=[student.name, topic_name],
        )

    return {"ok": True, "topic_name": topic_name, "status": "completed"}


@router.post("/{student_id}/class-complete")
def complete_class_for_student(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)

    if getattr(student, "parent_whatsapp", None):
        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="class_complete",
            body_parameters=[student.name],
        )

    return {"ok": True, "student_name": student.name, "status": "class_completed"}


@router.post("/{student_id}/project-complete")
def complete_project_for_student(student_id: int, project_name: str = "Final Project", db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)

    if getattr(student, "parent_whatsapp", None):
        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="project_completed",
            body_parameters=[student.name, project_name],
        )

    return {"ok": True, "student_name": student.name, "project_name": project_name, "status": "project_completed"}


@router.post("/{student_id}/attendance-present")
def attendance_present_for_student(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)

    if getattr(student, "parent_whatsapp", None):
        total_classes = student.total_classes if student.total_classes is not None else 30
        attended_row = db.execute(
            text("SELECT COUNT(*) FROM attendance WHERE student_id = :id AND LOWER(status) = 'present'"),
            {"id": student.id}
        ).fetchone()
        attended_classes = attended_row[0] if attended_row else 0
        remaining_classes = max(0, total_classes - attended_classes)

        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="attendance_present",
            body_parameters=[student.name, str(remaining_classes)],
        )

    return {"ok": True, "student_name": student.name, "status": "attendance_present"}