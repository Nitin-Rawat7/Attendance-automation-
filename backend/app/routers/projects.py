from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.models.student import Student
from app.models.student_project_progress import StudentProjectProgress
from app.services.whatsapp import send_template_message


router = APIRouter(
    prefix="/projects",
    tags=["projects"]
)


PROJECT_TABLES = {
    1: "robotics_projects",
    2: "ai_projects",
    3: "programming_projects",
}


class ProjectCreate(BaseModel):
    course_id: int
    name: str


@router.post("/course/{course_id}/add")
def add_project(
    course_id: int,
    payload: ProjectCreate,
    db: Session = Depends(get_db)
):
    table_name = PROJECT_TABLES.get(course_id)

    if not table_name:
        raise HTTPException(
            status_code=400,
            detail="unknown course_id"
        )

    result = db.execute(
        text(
            f"""
            INSERT INTO {table_name} (name, status)
            VALUES (:name, 'pending')
            RETURNING id
            """
        ),
        {
            "name": payload.name
        }
    )

    project_id = result.fetchone()[0]

    students = (
        db.query(Student)
        .filter(Student.course_id == course_id)
        .all()
    )

    for student in students:
        db.add(
            StudentProjectProgress(
                student_id=student.id,
                project_id=project_id,
                course_id=course_id,
                status="pending"
            )
        )

    db.commit()

    return {
        "ok": True,
        "project_id": project_id,
        "students_linked": len(students)
    }


@router.get("/student/{student_id}")
def list_projects_for_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    table_name = PROJECT_TABLES.get(student.course_id)

    if not table_name:
        raise HTTPException(
            status_code=400,
            detail="unknown course_id, no project table mapped"
        )

    rows = db.execute(
        text(
            f"""
            SELECT
                spp.project_id,
                p.name,
                spp.status
            FROM student_project_progress spp
            JOIN {table_name} p
                ON p.id = spp.project_id
            WHERE
                spp.student_id = :student_id
                AND spp.course_id = :course_id
            ORDER BY spp.project_id
            """
        ),
        {
            "student_id": student_id,
            "course_id": student.course_id
        }
    ).fetchall()

    return [
        {
            "project_id": row[0],
            "name": row[1] or f"Project {row[0]}",
            "status": row[2]
        }
        for row in rows
    ]


@router.post("/{student_id}/projects/{project_id}/complete")
async def complete_project_for_student(
    student_id: int,
    project_id: int,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    progress = (
        db.query(StudentProjectProgress)
        .filter(
            StudentProjectProgress.student_id == student_id,
            StudentProjectProgress.project_id == project_id,
            StudentProjectProgress.course_id == student.course_id
        )
        .first()
    )

    if not progress:
        raise HTTPException(
            status_code=404,
            detail="project progress record not found for this student"
        )

    table_name = PROJECT_TABLES.get(student.course_id)

    if not table_name:
        raise HTTPException(
            status_code=400,
            detail="unknown course_id, no project table mapped"
        )

    result = db.execute(
        text(
            f"""
            SELECT name
            FROM {table_name}
            WHERE id = :project_id
            """
        ),
        {
            "project_id": project_id
        }
    ).fetchone()

    project_name = (
        result[0]
        if result
        else "this project"
    )

    progress.status = "completed"

    db.commit()

    # ---------------------------------
    # WhatsApp project completion message
    # ---------------------------------

    try:

        await send_template_message(
            to=student.parent_whatsapp,
            template_name="project_completed",
            body_parameters=[
                student.name,
                project_name
            ]
        )

        print(
            "[whatsapp] project completion message sent successfully"
        )

    except Exception as e:

        print(
            f"[whatsapp] project notification failed: {e}"
        )

    return {
        "ok": True,
        "project_name": project_name,
        "status": "completed"
    }