import asyncio
import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.models.student import Student
from app.models.student_project_progress import StudentProjectProgress
from app.services.whatsapp import send_template_message

router = APIRouter(prefix="/students", tags=["projects"])

PROJECT_TABLES = {
    1: "robotics_projects",
    2: "ai_projects",
    3: "programming_projects",
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
            print("[whatsapp] notification sent successfully")
        except Exception as e:
            print(f"[whatsapp] notification failed: {e}")

    threading.Thread(target=send, daemon=True).start()


def get_project_table(course_id: int) -> str:
    table_name = PROJECT_TABLES.get(course_id)
    if not table_name:
        raise HTTPException(status_code=400, detail="unknown course_id, no project table mapped")
    return table_name


def get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="student not found")
    return student


# --- Schemas ---

class ProjectCreate(BaseModel):
    course_id: int
    name: str


class ProjectUpdate(BaseModel):
    name: str


class ProgressStatusUpdate(BaseModel):
    status: str


# --- Course Project Master Management Endpoints ---

@router.get("/course/{course_id}/projects")
def list_course_projects(course_id: int, db: Session = Depends(get_db)):
    table_name = get_project_table(course_id)
    rows = db.execute(text(f"SELECT id, name FROM {table_name} ORDER BY id ASC")).fetchall()
    return [{"id": r[0], "name": r[1]} for r in rows]


@router.post("/course/{course_id}/add-project")
def add_project(course_id: int, payload: ProjectCreate, db: Session = Depends(get_db)):
    table_name = get_project_table(course_id)

    result = db.execute(
        text(f"INSERT INTO {table_name} (name) VALUES (:name) RETURNING id"),
        {"name": payload.name},
    )
    project_id = result.fetchone()[0]

    students = db.query(Student).filter(Student.course_id == course_id).all()
    for student in students:
        db.add(
            StudentProjectProgress(
                student_id=student.id,
                project_id=project_id,
                course_id=course_id,
                status="pending",
            )
        )
    db.commit()

    return {"ok": True, "project_id": project_id, "students_linked": len(students)}


@router.put("/course/{course_id}/projects/{project_id}")
def update_course_project(course_id: int, project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    table_name = get_project_table(course_id)
    result = db.execute(
        text(f"UPDATE {table_name} SET name = :name WHERE id = :id"),
        {"name": payload.name, "id": project_id},
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True, "message": "Project updated"}


@router.delete("/course/{course_id}/projects/{project_id}")
def delete_course_project(course_id: int, project_id: int, db: Session = Depends(get_db)):
    table_name = get_project_table(course_id)

    # Delete tracking records for students
    db.query(StudentProjectProgress).filter(
        StudentProjectProgress.course_id == course_id,
        StudentProjectProgress.project_id == project_id
    ).delete()

    # Delete project from master table
    result = db.execute(text(f"DELETE FROM {table_name} WHERE id = :id"), {"id": project_id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True, "message": "Project deleted"}


# --- Student Project Progress Endpoints ---

@router.get("/{student_id}/projects")
def list_student_projects(student_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    table_name = get_project_table(student.course_id)

    rows = db.execute(
        text(
            f"""
            SELECT spp.id, spp.project_id, p.name, spp.status
            FROM student_project_progress spp
            JOIN {table_name} p ON p.id = spp.project_id
            WHERE spp.student_id = :student_id AND spp.course_id = :course_id
            ORDER BY spp.project_id
            """
        ),
        {"student_id": student_id, "course_id": student.course_id},
    ).fetchall()

    return [
        {
            "id": row[0],
            "project_id": row[1],
            "project_title": row[2] or f"Project {row[1]}",
            "name": row[2] or f"Project {row[1]}",
            "status": row[3],
        }
        for row in rows
    ]


@router.put("/project-progress/{progress_id}")
def update_project_progress_status(progress_id: int, payload: ProgressStatusUpdate, db: Session = Depends(get_db)):
    progress = db.query(StudentProjectProgress).filter(StudentProjectProgress.id == progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="project progress record not found")

    progress.status = payload.status
    db.commit()
    return {"ok": True, "status": progress.status}


@router.post("/{student_id}/projects/{project_id}/complete")
def complete_project_for_student(student_id: int, project_id: int, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)

    progress = (
        db.query(StudentProjectProgress)
        .filter(
            StudentProjectProgress.student_id == student_id,
            StudentProjectProgress.project_id == project_id,
            StudentProjectProgress.course_id == student.course_id,
        )
        .first()
    )

    if not progress:
        raise HTTPException(status_code=404, detail="project progress record not found for this student")

    table_name = get_project_table(student.course_id)
    result = db.execute(
        text(f"SELECT name FROM {table_name} WHERE id = :project_id"),
        {"project_id": project_id},
    ).fetchone()

    project_name = result[0] if result else "this project"
    progress.status = "completed"
    db.commit()

    if getattr(student, "parent_whatsapp", None):
        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="project_complete",
            body_parameters=[student.name, project_name],
        )

    return {"ok": True, "project_name": project_name, "status": "completed"}