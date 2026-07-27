from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.db import get_db
from app.models.student import Student
from app.models.course import Course
from app.models.student_topic_progress import StudentTopicProgress
from app.models.student_project_progress import StudentProjectProgress

router = APIRouter(
    prefix="/students",
    tags=["students"]
)
 

TOPIC_TABLES = {
    1: "robotics_topics",
    2: "ai_topics",
    3: "programming_topics",
}


PROJECT_TABLES = {
    1: "robotics_projects",
    2: "ai_projects",
    3: "programming_projects",
}


# ============================================================
# REQUEST MODELS
# ============================================================

class RenewRequest(BaseModel):
    additional_classes: int


class StudentCreate(BaseModel):
    name: str
    course_id: int
    parent_whatsapp: str
    total_classes: int
    remaining_classes: int


class StudentUpdate(BaseModel):
    name: str
    course_id: int
    parent_whatsapp: str
    total_classes: int
    remaining_classes: int


# ============================================================
# CREATE STUDENT
# ============================================================

@router.post("/")
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db)
):

    student = Student(
        name=payload.name,
        course_id=payload.course_id,
        parent_whatsapp=payload.parent_whatsapp,
        total_classes=payload.total_classes,
        remaining_classes=payload.remaining_classes,
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    # --------------------------------------------------------
    # LINK EXISTING TOPICS
    # --------------------------------------------------------

    topic_table = TOPIC_TABLES.get(payload.course_id)

    if topic_table:

        existing_topics = db.execute(
            text(
                f"""
                SELECT id
                FROM {topic_table}
                """
            )
        ).fetchall()

        for topic in existing_topics:

            db.add(
                StudentTopicProgress(
                    student_id=student.id,
                    topic_id=topic[0],
                    course_id=payload.course_id,
                    status="pending"
                )
            )

    # --------------------------------------------------------
    # LINK EXISTING PROJECTS
    # --------------------------------------------------------

    project_table = PROJECT_TABLES.get(payload.course_id)

    if project_table:

        existing_projects = db.execute(
            text(
                f"""
                SELECT id
                FROM {project_table}
                """
            )
        ).fetchall()

        for project in existing_projects:

            db.add(
                StudentProjectProgress(
                    student_id=student.id,
                    project_id=project[0],
                    course_id=payload.course_id,
                    status="pending"
                )
            )

    db.commit()

    return {
        "ok": True,
        "student_id": student.id
    }


# ============================================================
# LIST STUDENTS
# ============================================================

@router.get("/")
def list_students(
    db: Session = Depends(get_db)
):

    students = (
        db.query(Student)
        .all()
    )

    courses = {
        course.id: course.name
        for course in db.query(Course).all()
    }

    return [

        {
            "id": student.id,
            "name": student.name,
            "course_name": courses.get(
                student.course_id,
                "N/A"
            ),
            "course_id": student.course_id,
            "total_classes": student.total_classes,
            "remaining_classes": student.remaining_classes,
            "parent_whatsapp": student.parent_whatsapp,
        }

        for student in students

    ]


# ============================================================
# UPDATE STUDENT
# ============================================================

@router.put("/{student_id}")
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db)
):

    student = (

        db.query(Student)

        .filter(
            Student.id == student_id
        )

        .first()

    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    # --------------------------------------------------------
    # UPDATE STUDENT INFORMATION
    # --------------------------------------------------------

    student.name = payload.name
    student.parent_whatsapp = payload.parent_whatsapp
    student.total_classes = payload.total_classes
    student.remaining_classes = payload.remaining_classes

    # --------------------------------------------------------
    # COURSE CHANGE
    # --------------------------------------------------------

    if student.course_id != payload.course_id:

        student.course_id = payload.course_id

        # Remove old topic progress
        db.query(
            StudentTopicProgress
        ).filter(
            StudentTopicProgress.student_id == student_id
        ).delete(
            synchronize_session=False
        )

        # Remove old project progress
        db.query(
            StudentProjectProgress
        ).filter(
            StudentProjectProgress.student_id == student_id
        ).delete(
            synchronize_session=False
        )

        # Link topics from new course
        topic_table = TOPIC_TABLES.get(
            payload.course_id
        )

        if topic_table:

            existing_topics = db.execute(
                text(
                    f"""
                    SELECT id
                    FROM {topic_table}
                    """
                )
            ).fetchall()

            for topic in existing_topics:

                db.add(
                    StudentTopicProgress(
                        student_id=student_id,
                        topic_id=topic[0],
                        course_id=payload.course_id,
                        status="pending"
                    )
                )

        # Link projects from new course
        project_table = PROJECT_TABLES.get(
            payload.course_id
        )

        if project_table:

            existing_projects = db.execute(
                text(
                    f"""
                    SELECT id
                    FROM {project_table}
                    """
                )
            ).fetchall()

            for project in existing_projects:

                db.add(
                    StudentProjectProgress(
                        student_id=student_id,
                        project_id=project[0],
                        course_id=payload.course_id,
                        status="pending"
                    )
                )

    db.commit()
    db.refresh(student)

    return {

        "ok": True,

        "student": {

            "id": student.id,
            "name": student.name,
            "course_id": student.course_id,
            "parent_whatsapp": student.parent_whatsapp,
            "total_classes": student.total_classes,
            "remaining_classes": student.remaining_classes,

        }

    }


# ============================================================
# DELETE STUDENT
# ============================================================

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db)
):

    student = (

        db.query(Student)

        .filter(
            Student.id == student_id
        )

        .first()

    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    # --------------------------------------------------------
    # DELETE TOPIC PROGRESS
    # --------------------------------------------------------

    db.query(
        StudentTopicProgress
    ).filter(
        StudentTopicProgress.student_id == student_id
    ).delete(
        synchronize_session=False
    )

    # --------------------------------------------------------
    # DELETE PROJECT PROGRESS
    # --------------------------------------------------------

    db.query(
        StudentProjectProgress
    ).filter(
        StudentProjectProgress.student_id == student_id
    ).delete(
        synchronize_session=False
    )

    # --------------------------------------------------------
    # DELETE ATTENDANCE RECORDS
    # --------------------------------------------------------

    db.execute(
        text(
            """
            DELETE FROM attendance
            WHERE student_id = :student_id
            """
        ),
        {
            "student_id": student_id
        }
    )

    # --------------------------------------------------------
    # DELETE MEDIA RECORDS
    # --------------------------------------------------------

    db.execute(
        text(
            """
            DELETE FROM media
            WHERE student_id = :student_id
            """
        ),
        {
            "student_id": student_id
        }
    )

    # --------------------------------------------------------
    # DELETE STUDENT
    # --------------------------------------------------------

    db.delete(student)

    db.commit()

    return {

        "ok": True,

        "message": "student deleted successfully"

    }


# ============================================================
# STUDENT PROGRESS
# ============================================================

@router.get("/{student_id}/progress")
def student_progress(
    student_id: int,
    db: Session = Depends(get_db)
):

    student = (

        db.query(Student)

        .filter(
            Student.id == student_id
        )

        .first()

    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    completed_classes = (

        student.total_classes
        - student.remaining_classes

    )

    return {

        "student_name": student.name,

        "total_classes": student.total_classes,

        "completed_classes": completed_classes,

        "remaining_classes": student.remaining_classes,

    }


# ============================================================
# RENEW CLASSES
# ============================================================

@router.post("/{student_id}/renew")
def renew_classes(
    student_id: int,
    payload: RenewRequest,
    db: Session = Depends(get_db)
):

    student = (

        db.query(Student)

        .filter(
            Student.id == student_id
        )

        .first()

    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="student not found"
        )

    student.total_classes += (
        payload.additional_classes
    )

    student.remaining_classes += (
        payload.additional_classes
    )

    db.commit()

    return {

        "ok": True,

        "total_classes": student.total_classes,

        "remaining_classes": student.remaining_classes,

    }