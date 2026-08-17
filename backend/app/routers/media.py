import uuid
import os
import shutil
import requests
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.models.student import Student

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/")
def list_all_media(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT 
                m.id, 
                m.student_id, 
                s.name as student_name, 
                m.type, 
                m.media_url, 
                m.sent,
                m.caption
            FROM media m
            JOIN students s ON s.id = m.student_id
            ORDER BY m.id DESC
            """
        )
    ).fetchall()

    return [
        {
            "id": row[0],
            "student_id": row[1],
            "student_name": row[2],
            "type": row[3] or "photo",
            "media_url": row[4] or "",
            "sent": row[5] if row[5] is not None else False,
            "caption": row[6] or "",
        }
        for row in rows
    ]

@router.get("/students/{student_id}")
@router.get("/student/{student_id}")
def list_student_media(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    rows = db.execute(
        text(
            """
            SELECT 
                m.id, 
                m.student_id, 
                s.name as student_name, 
                m.type, 
                m.media_url, 
                m.sent,
                m.caption
            FROM media m
            JOIN students s ON s.id = m.student_id
            WHERE m.student_id = :student_id
            ORDER BY m.id DESC
            """
        ),
        {"student_id": student_id},
    ).fetchall()

    return [
        {
            "id": row[0],
            "student_id": row[1],
            "student_name": row[2],
            "type": row[3] or "photo",
            "media_url": row[4] or "",
            "sent": row[5] if row[5] is not None else False,
            "caption": row[6] or "",
        }
        for row in rows
    ]

@router.post("/")
def create_media(
    student_id: int = Form(...),
    type: str = Form("photo"),
    caption: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    media_url: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    final_url = media_url or ""
    if file:
        ext = os.path.splitext(file.filename)[1]
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        host_base = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")
        final_url = f"{host_base}/uploads/{safe_filename}"

    if not final_url:
        raise HTTPException(status_code=400, detail="Please provide either a file or a media URL")

    result = db.execute(
        text(
            """
            INSERT INTO media (student_id, type, media_url, sent, caption)
            VALUES (:student_id, :type, :media_url, false, :caption)
            RETURNING id
            """
        ),
        {
            "student_id": student_id,
            "type": type,
            "media_url": final_url,
            "caption": caption or "",
        },
    )
    row = result.fetchone()
    db.commit()

    return {
        "id": row[0],
        "student_id": student_id,
        "student_name": student.name,
        "type": type,
        "media_url": final_url,
        "sent": False,
        "caption": caption or "",
    }

@router.post("/{media_id}/send")
def send_media_to_whatsapp(media_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text(
            """
            SELECT 
                m.id, 
                m.student_id, 
                s.name as student_name, 
                s.parent_whatsapp as parent_phone, 
                m.type, 
                m.media_url, 
                m.caption,
                m.sent
            FROM media m
            JOIN students s ON s.id = m.student_id
            WHERE m.id = :media_id
            """
        ),
        {"media_id": media_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Media record not found")

    _, student_id, student_name, parent_phone, media_type, media_url, caption, sent = row

    if not parent_phone:
        raise HTTPException(status_code=400, detail="Parent WhatsApp number is missing for this student in database")

    supabase_base_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.getenv("SUPABASE_KEY", "")

    if not supabase_base_url or not supabase_key:
        raise HTTPException(
            status_code=500, 
            detail="Supabase configuration (SUPABASE_URL or SUPABASE_KEY) is missing in .env file"
        )

    supabase_url = f"{supabase_base_url}/functions/v1/send-whatsapp"

    payload = {
        "student_id": student_id,
        "student_name": student_name,
        "phone": parent_phone,
        "media_url": media_url,
        "type": media_type,
        "caption": caption or f"Project update for {student_name}"
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {supabase_key}"
    }

    try:
        response = requests.post(supabase_url, json=payload, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Edge Function error: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Supabase Edge Function: {str(e)}")

    db.execute(
        text("UPDATE media SET sent = true WHERE id = :media_id"),
        {"media_id": media_id}
    )
    db.commit()

    return {"ok": True, "message": "Media sent successfully to WhatsApp"}

@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    result = db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Media record not found")
    return {"ok": True}