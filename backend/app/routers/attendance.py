import asyncio
import threading

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app.models.student import Student
from app.models.attendance import Attendance
from app.services.whatsapp import send_template_message


router = APIRouter(prefix="/attendance", tags=["attendance"])


def fire_whatsapp_notification(
    to: str,
    template_name: str,
    body_parameters: list[str],
):
    print(
        f"[whatsapp] fire notification called | "
        f"to={to} | "
        f"template={template_name} | "
        f"parameters={body_parameters}"
    )

    def send_message():
        try:
            print("[whatsapp] sending message to Meta API...")

            asyncio.run(
                send_template_message(
                    to=to,
                    template_name=template_name,
                    body_parameters=body_parameters,
                )
            )

            print("[whatsapp] message sent successfully")

        except Exception as e:
            print(f"[whatsapp] notification failed: {e}")

    threading.Thread(target=send_message).start()


@router.post("/{student_id}/mark")
def mark_attendance(
    student_id: int,
    status: str,
    db: Session = Depends(get_db),
):
    print(
        f"[attendance] endpoint called | "
        f"student_id={student_id} | "
        f"status={status}"
    )

    if status not in ("present", "absent"):
        raise HTTPException(
            400,
            "status must be present or absent",
        )

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            404,
            "student not found",
        )

    db.add(
        Attendance(
            student_id=student_id,
            status=status,
        )
    )

    try:
        db.flush()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            400,
            "attendance already marked for this student today",
        )

    if status == "present":
        student.remaining_classes = max(
            student.remaining_classes - 1,
            0,
        )

    db.commit()

    completed_classes = (
        student.total_classes
        - student.remaining_classes
    )

    if status == "present":

        fire_whatsapp_notification(
            to=student.parent_whatsapp,
            template_name="attendance_present",
            body_parameters=[
                student.name,
                str(student.remaining_classes),
            ],
        )

    return {
        "ok": True,
        "completed_classes": completed_classes,
        "remaining_classes": student.remaining_classes,
    }