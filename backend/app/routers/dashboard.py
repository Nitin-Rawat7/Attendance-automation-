from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date
from app.db import get_db
from app.models.student import Student
from app.models.attendance import Attendance

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_students = db.query(func.count(Student.id)).scalar()

    today = date.today()
    today_present = (
        db.query(func.count(Attendance.id))
        .filter(Attendance.date == today, Attendance.status == "present")
        .scalar()
    )
    today_absent = (
        db.query(func.count(Attendance.id))
        .filter(Attendance.date == today, Attendance.status == "absent")
        .scalar()
    )

    total_remaining_classes = db.query(func.sum(Student.remaining_classes)).scalar() or 0
    total_completed_classes = (
        db.query(func.sum(Student.total_classes - Student.remaining_classes)).scalar() or 0
    )

    topics_row = db.execute(
        text("""
            select
                count(*) filter (where status = 'completed') as completed,
                count(*) filter (where status = 'pending') as pending
            from student_topic_progress
        """)
    ).fetchone()
    topics_completed = topics_row[0] or 0
    topics_pending = topics_row[1] or 0

    projects_row = db.execute(
        text("""
            select
                count(*) filter (where status = 'completed') as completed,
                count(*) filter (where status = 'pending') as pending
            from student_project_progress
        """)
    ).fetchone()
    projects_completed = projects_row[0] or 0
    projects_pending = projects_row[1] or 0

    return {
        "total_students": total_students,
        "today_present": today_present,
        "today_absent": today_absent,
        "total_completed_classes": total_completed_classes,
        "total_remaining_classes": total_remaining_classes,
        "topics_completed": topics_completed,
        "topics_pending": topics_pending,
        "projects_completed": projects_completed,
        "projects_pending": projects_pending,
    }