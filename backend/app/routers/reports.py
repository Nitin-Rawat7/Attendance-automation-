from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.models.student import Student
from app.models.student_topic_progress import StudentTopicProgress
from app.models.student_project_progress import StudentProjectProgress

# Safe import or fallback for whatsapp notification service
try:
    from app.services.whatsapp import fire_whatsapp_notification
except ImportError:
    def fire_whatsapp_notification(to: str, template_name: str, body_parameters: list):
        print(f"[Mock Service] Sending WhatsApp to {to} using template {template_name} with params {body_parameters}")

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_student_course_name(db: Session, student: Student) -> str:
    """Safely retrieves course name from the courses table using student's course_id."""
    course_id = getattr(student, "course_id", None)
    if not course_id:
        return "Unassigned"
    
    try:
        row = db.execute(
            text("SELECT name FROM courses WHERE id = :course_id"), 
            {"course_id": course_id}
        ).fetchone()
        if row and row[0]:
            return str(row[0])
    except Exception:
        pass
    
    return "Their Course"


def _get_parent_whatsapp(student: Student) -> str:
    """Safely retrieves parent WhatsApp contact info from the Student model."""
    for attr in ["parent_whatsapp", "parent_phone", "whatsapp_number", "phone"]:
        val = getattr(student, attr, None)
        if val:
            return str(val)
    return ""


@router.get("/student/{student_id}")
def get_student_report(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course_name = _get_student_course_name(db, student)
    parent_whatsapp = _get_parent_whatsapp(student)

    # 1. Attendance Metrics
    att_total = db.execute(
        text("SELECT COUNT(*) FROM attendance WHERE student_id = :s_id"),
        {"s_id": student_id},
    ).scalar() or 0

    att_present = db.execute(
        text("SELECT COUNT(*) FROM attendance WHERE student_id = :s_id AND status = 'present'"),
        {"s_id": student_id},
    ).scalar() or 0

    att_pct = round((att_present / att_total * 100), 1) if att_total > 0 else 100.0

    # 2. Topic Progress Metrics
    topic_total = db.query(StudentTopicProgress).filter(
        StudentTopicProgress.student_id == student_id
    ).count()

    topic_completed = db.query(StudentTopicProgress).filter(
        StudentTopicProgress.student_id == student_id,
        StudentTopicProgress.status == "completed",
    ).count()

    topic_pct = round((topic_completed / topic_total * 100), 1) if topic_total > 0 else 0.0

    # 3. Project Progress Metrics
    proj_total = db.query(StudentProjectProgress).filter(
        StudentProjectProgress.student_id == student_id
    ).count()

    proj_completed = db.query(StudentProjectProgress).filter(
        StudentProjectProgress.student_id == student_id,
        StudentProjectProgress.status == "completed",
    ).count()

    proj_pct = round((proj_completed / proj_total * 100), 1) if proj_total > 0 else 0.0

    # 4. Generate Performance Text
    ai_summary = (
        f"Dear Parent,\n\n"
        f"Here is the learning progress report for {student.name} in {course_name}:\n\n"
        f"• Attendance: {att_pct}% ({att_present}/{att_total} classes)\n"
        f"• Curriculum Completion: {topic_pct}% ({topic_completed}/{topic_total} topics)\n"
        f"• Practical Projects: {proj_pct}% ({proj_completed}/{proj_total} projects completed)\n\n"
        f"Overall Performance: {'Excellent' if topic_pct >= 75 else 'Good progress'}. Keep up the great work!"
    )

    return {
        "student_id": student.id,
        "student_name": student.name,
        "course_name": course_name,
        "parent_whatsapp": parent_whatsapp,
        "attendance": {
            "total_days": att_total,
            "present_days": att_present,
            "percentage": att_pct,
        },
        "topics": {
            "total": topic_total,
            "completed": topic_completed,
            "percentage": topic_pct,
        },
        "projects": {
            "total": proj_total,
            "completed": proj_completed,
            "percentage": proj_pct,
        },
        "ai_summary": ai_summary,
    }


@router.post("/student/{student_id}/send-whatsapp")
def send_report_card_whatsapp(student_id: int, db: Session = Depends(get_db)):
    report = get_student_report(student_id, db)

    if not report["parent_whatsapp"]:
        raise HTTPException(
            status_code=400,
            detail="Parent WhatsApp contact information is missing for this student.",
        )

    fire_whatsapp_notification(
        to=report["parent_whatsapp"],
        template_name="student_progress_report",
        body_parameters=[
            report["student_name"],
            f"{report['attendance']['percentage']}%",
            f"{report['topics']['percentage']}%",
            f"{report['projects']['completed']}/{report['projects']['total']}",
        ],
    )

    return {"ok": True, "sent_to": report["parent_whatsapp"]}