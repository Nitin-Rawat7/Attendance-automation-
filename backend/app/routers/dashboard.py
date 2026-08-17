from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Attendance, Course, Student

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """
    Returns high-level metric counts for the dashboard.
    """
    total_students = db.query(func.count(Student.id)).scalar() or 0

    today = date.today()
    present_today = db.query(func.count(Attendance.id)).filter(
        Attendance.date == today,
        Attendance.status == "Present"
    ).scalar() or 0

    absent_today = db.query(func.count(Attendance.id)).filter(
        Attendance.date == today,
        Attendance.status == "Absent"
    ).scalar() or 0

    total_courses = db.query(func.count(Course.id)).scalar() or 0

    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "total_courses": total_courses
    }


@router.get("/students")
def get_all_dashboard_students(db: Session = Depends(get_db)):
    """
    Returns ALL students by using an outerjoin so students without 
    attendance records are not excluded.
    """
    students_data = db.query(
        Student.id,
        Student.name,
        func.count(Attendance.id).label("total_logs")
    ).outerjoin(
        Attendance, Student.id == Attendance.student_id
    ).group_by(
        Student.id, Student.name
    ).all()

    return [
        {
            "id": s_id,
            "name": name,
            "total_logs": total_logs
        }
        for s_id, name, total_logs in students_data
    ]