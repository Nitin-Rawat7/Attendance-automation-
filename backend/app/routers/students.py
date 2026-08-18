from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel  # <-- Yeh line zaroor honi chahiye
import asyncio
import threading
from datetime import datetime

from app.db import get_db
from app.services.whatsapp import send_template_message

router = APIRouter(prefix="/students", tags=["students"])

TOPIC_TABLES = {
    1: "robotics_topics",
    2: "ai_topics",
    3: "programming_topics",
}

def get_topic_table(course_id: int) -> str:
    return TOPIC_TABLES.get(course_id, "robotics_topics")


class StudentCreate(BaseModel):
    name: str
    parent_whatsapp: Optional[str] = None
    total_classes: Optional[int] = 30
    course_id: Optional[int] = 1


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    parent_whatsapp: Optional[str] = None
    total_classes: Optional[int] = None
    course_id: Optional[int] = None


# --- Helper for Background WhatsApp Notifications ---
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


@router.get("/")
def list_students(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT 
                s.id, 
                s.name, 
                COALESCE(s.parent_whatsapp, '') as parent_whatsapp,
                COALESCE(s.total_classes, 30) as total_classes,
                s.course_id,
                c.name as course_name,
                COALESCE(COUNT(CASE WHEN LOWER(a.status) = 'present' THEN 1 END), 0) as attended_classes
            FROM students s
            LEFT JOIN courses c ON s.course_id = c.id
            LEFT JOIN attendance a ON a.student_id = s.id
            GROUP BY s.id, s.name, s.parent_whatsapp, s.total_classes, s.course_id, c.name
            ORDER BY s.id ASC
            """
        )
    ).fetchall()

    result = []
    for row in rows:
        total = row[3] if row[3] is not None else 30
        attended = row[6]
        remaining = max(0, total - attended)
        result.append(
            {
                "id": row[0],
                "name": row[1],
                "parent_whatsapp": row[2],
                "total_classes": total,
                "course_id": row[4],
                "course_name": row[5] or "Unassigned",
                "attended_classes": attended,
                "remaining_classes": remaining,
            }
        )
    return result


@router.post("/")
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    result = db.execute(
        text(
            """
            INSERT INTO students (name, parent_whatsapp, total_classes, course_id)
            VALUES (:name, :parent_whatsapp, :total_classes, :course_id)
            RETURNING id
            """
        ),
        {
            "name": payload.name,
            "parent_whatsapp": payload.parent_whatsapp,
            "total_classes": payload.total_classes or 30,
            "course_id": payload.course_id or 1,
        },
    )
    student_id = result.fetchone()[0]
    db.commit()
    return {"id": student_id, "message": "Student created successfully"}


# --- WhatsApp Triggers ---

@router.post("/{student_id}/attendance-present")
def notify_student_arrived(student_id: int, db: Session = Depends(get_db)):
    student_row = db.execute(
        text("SELECT id, name, parent_whatsapp, total_classes FROM students WHERE id = :id"),
        {"id": student_id}
    ).fetchone()

    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = student_row[1]
    parent_whatsapp = student_row[2]
    total_classes = student_row[3] if student_row[3] is not None else 30

    if not parent_whatsapp:
        raise HTTPException(status_code=400, detail="Student has no parent WhatsApp number configured")

    attended_row = db.execute(
        text("SELECT COUNT(*) FROM attendance WHERE student_id = :id AND LOWER(status) = 'present'"),
        {"id": student_id}
    ).fetchone()
    attended_classes = attended_row[0] if attended_row else 0

    today_str = datetime.now().strftime("%Y-%m-%d")
    existing_att = db.execute(
        text("SELECT id FROM attendance WHERE student_id = :id AND attendance_date = :date"),
        {"id": student_id, "date": today_str}
    ).fetchone()

    if not existing_att:
        db.execute(
            text("INSERT INTO attendance (student_id, attendance_date, status) VALUES (:id, :date, 'present')"),
            {"id": student_id, "date": today_str}
        )
        db.commit()
        attended_classes += 1

    remaining_classes = max(0, total_classes - attended_classes)

    fire_whatsapp_notification(
        to=parent_whatsapp,
        template_name="attendance_present",
        body_parameters=[student_name, str(remaining_classes)],
    )

    return {"message": "Student arrived notification sent successfully", "remaining_classes": remaining_classes}


@router.post("/{student_id}/left")
@router.post("/{student_id}/class-complete")
def notify_student_left(student_id: int, db: Session = Depends(get_db)):
    student_row = db.execute(
        text("SELECT id, name, parent_whatsapp FROM students WHERE id = :id"),
        {"id": student_id}
    ).fetchone()

    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = student_row[1]
    parent_whatsapp = student_row[2]

    if not parent_whatsapp:
        raise HTTPException(status_code=400, detail="Student has no parent WhatsApp number configured")

    fire_whatsapp_notification(
        to=parent_whatsapp,
        template_name="class_complete",
        body_parameters=[student_name],
    )

    return {"message": "Class complete notification sent successfully"}


@router.post("/{student_id}/topics/{topic_id}/complete")
def complete_topic_for_student(student_id: int, topic_id: int, db: Session = Depends(get_db)):
    student_row = db.execute(
        text("SELECT id, name, parent_whatsapp, course_id FROM students WHERE id = :id"),
        {"id": student_id}
    ).fetchone()

    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")

    student_id, student_name, parent_whatsapp, course_id = student_row
    course_id = course_id or 1

    table_name = get_topic_table(course_id)
    topic_row = db.execute(
        text(f"SELECT name FROM {table_name} WHERE id = :topic_id"),
        {"topic_id": topic_id}
    ).fetchone()

    topic_name = topic_row[0] if topic_row else "Topic"

    progress_row = db.execute(
        text("""
            SELECT status FROM student_topic_progress 
            WHERE student_id = :student_id AND topic_id = :topic_id AND course_id = :course_id
        """),
        {"student_id": student_id, "topic_id": topic_id, "course_id": course_id}
    ).fetchone()

    if progress_row and progress_row[0] == 'completed':
        return {"ok": True, "message": "Topic is already completed. No duplicate notification sent.", "status": "completed"}

    if progress_row:
        db.execute(
            text("""
                UPDATE student_topic_progress 
                SET status = 'completed' 
                WHERE student_id = :student_id AND topic_id = :topic_id AND course_id = :course_id
            """),
            {"student_id": student_id, "topic_id": topic_id, "course_id": course_id}
        )
    else:
        db.execute(
            text("""
                INSERT INTO student_topic_progress (student_id, topic_id, course_id, status)
                VALUES (:student_id, :topic_id, :course_id, 'completed')
            """),
            {"student_id": student_id, "topic_id": topic_id, "course_id": course_id}
        )
    db.commit()

    if parent_whatsapp:
        fire_whatsapp_notification(
            to=parent_whatsapp,
            template_name="topic_complete",
            body_parameters=[student_name, topic_name],
        )

    return {"ok": True, "topic_name": topic_name, "status": "completed"}


@router.post("/{student_id}/project-update")
@router.post("/{student_id}/project-complete")
@router.post("/{student_id}/projects/{project_id}/complete")
def complete_project_for_student(student_id: int, project_id: Optional[int] = None, project_name: Optional[str] = None, db: Session = Depends(get_db)):
    student_row = db.execute(
        text("SELECT id, name, parent_whatsapp FROM students WHERE id = :id"),
        {"id": student_id}
    ).fetchone()

    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")

    student_id, student_name, parent_whatsapp = student_row

    proj_name = project_name or "Final Project"
    if project_id:
        proj_row = db.execute(
            text("SELECT name FROM projects WHERE id = :id"),
            {"id": project_id}
        ).fetchone()
        if proj_row:
            proj_name = proj_row[0]

    if not parent_whatsapp:
        raise HTTPException(status_code=400, detail="Student has no parent WhatsApp number configured")

    fire_whatsapp_notification(
        to=parent_whatsapp,
        template_name="project_completed",
        body_parameters=[student_name, proj_name],
    )

    return {"ok": True, "student_name": student_name, "project_name": proj_name, "status": "project_completed"}


@router.put("/{student_id}")
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    updates = []
    params = {"student_id": student_id}

    if payload.name is not None:
        updates.append("name = :name")
        params["name"] = payload.name
    if payload.parent_whatsapp is not None:
        updates.append("parent_whatsapp = :parent_whatsapp")
        params["parent_whatsapp"] = payload.parent_whatsapp
    if payload.total_classes is not None:
        updates.append("total_classes = :total_classes")
        params["total_classes"] = payload.total_classes
    if payload.course_id is not None:
        updates.append("course_id = :course_id")
        params["course_id"] = payload.course_id

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    sql = f"UPDATE students SET {', '.join(updates)} WHERE id = :student_id"
    result = db.execute(text(sql), params)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Student not found")

    return {"message": "Student updated successfully"}


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM attendance WHERE student_id = :id"), {"id": student_id})
        db.execute(text("DELETE FROM student_topic_progress WHERE student_id = :id"), {"id": student_id})
        
        result = db.execute(text("DELETE FROM students WHERE id = :id"), {"id": student_id})
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")
            
        return {"message": "Student deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))