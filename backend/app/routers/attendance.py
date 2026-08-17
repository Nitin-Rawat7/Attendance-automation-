from datetime import date as DateType
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import asyncio
import threading

from app.db import get_db
from app.models.student import Student
from app.services.whatsapp import send_template_message

router = APIRouter(prefix="/attendance", tags=["attendance"])


class RecordItem(BaseModel):
    student_id: int
    status: str  # present | absent | late
    notes: Optional[str] = ""


class BatchAttendanceCreate(BaseModel):
    date: str  # YYYY-MM-DD
    notify_parents: bool = True
    records: List[RecordItem]


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


@router.get("/by-date")
def get_attendance_by_date(date: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT student_id, status, notes
            FROM attendance
            WHERE attendance_date = :date
            """
        ),
        {"date": date},
    ).fetchall()

    return [{"student_id": row[0], "status": row[1], "notes": row[2] or ""} for row in rows]


@router.post("/mark")
def mark_batch_attendance(payload: BatchAttendanceCreate, db: Session = Depends(get_db)):
    for rec in payload.records:
        existing = db.execute(
            text(
                """
                SELECT id FROM attendance 
                WHERE student_id = :student_id AND attendance_date = :date
                """
            ),
            {"student_id": rec.student_id, "date": payload.date}
        ).fetchone()

        if existing:
            db.execute(
                text(
                    """
                    UPDATE attendance 
                    SET status = :status, notes = :notes 
                    WHERE student_id = :student_id AND attendance_date = :date
                    """
                ),
                {
                    "student_id": rec.student_id,
                    "date": payload.date,
                    "status": rec.status,
                    "notes": rec.notes,
                },
            )
        else:
            db.execute(
                text(
                    """
                    INSERT INTO attendance (student_id, attendance_date, status, notes)
                    VALUES (:student_id, :date, :status, :notes)
                    """
                ),
                {
                    "student_id": rec.student_id,
                    "date": payload.date,
                    "status": rec.status,
                    "notes": rec.notes,
                },
            )

        if payload.notify_parents:
            student = db.query(Student).filter(Student.id == rec.student_id).first()
            if student and getattr(student, "parent_whatsapp", None):
                status_lower = rec.status.lower()
                
                # Calculate remaining classes for attendance present
                total_classes = student.total_classes if student.total_classes is not None else 30
                attended_count = db.execute(
                    text("SELECT COUNT(*) FROM attendance WHERE student_id = :id AND LOWER(status) = 'present'"),
                    {"id": student.id}
                ).fetchone()[0]
                remaining_classes = max(0, total_classes - attended_count)

                if status_lower == "present":
                    fire_whatsapp_notification(
                        to=student.parent_whatsapp,
                        template_name="attendance_present",
                        body_parameters=[student.name, str(remaining_classes)],
                    )
                elif status_lower == "absent":
                    fire_whatsapp_notification(
                        to=student.parent_whatsapp,
                        template_name="student_absent_notice",
                        body_parameters=[student.name, payload.date],
                    )

    db.commit()
    return {"ok": True, "processed": len(payload.records)}


@router.get("/{student_id}")
def get_student_attendance_history(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    rows = db.execute(
        text(
            """
            SELECT id, attendance_date, status, notes
            FROM attendance
            WHERE student_id = :student_id
            ORDER BY attendance_date DESC
            """
        ),
        {"student_id": student_id},
    ).fetchall()

    return [
        {
            "id": row[0],
            "date": str(row[1]),
            "status": row[2],
            "notes": row[3] or "",
        }
        for row in rows
    ]