import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

# --- In-Memory Log Store ---
db_whatsapp_logs = []


# --- Pydantic Schemas ---
class WhatsAppProjectRequest(BaseModel):
    phone: str = Field(..., example="+919876543210")
    student_name: str = Field(..., example="Alex Johnson")
    project_title: str = Field(..., example="Python Calculator")


class WhatsAppAttendanceRequest(BaseModel):
    phone: str = Field(..., example="+919876543210")
    student_name: str = Field(..., example="Alex Johnson")
    status: str = Field(..., example="absent")
    date: str = Field(..., example="2026-06-06")


class WhatsAppCustomRequest(BaseModel):
    phone: str = Field(..., example="+919876543210")
    message: str = Field(..., example="Reminder: Classes resume on Monday.")


class LogResponse(BaseModel):
    id: str
    phone: str
    message: str
    status: str
    timestamp: str


# --- Helper Function for External API Integration ---
def send_whatsapp_gateway(phone: str, message: str) -> bool:
    """
    Placeholder for Twilio, Meta WhatsApp API, or UltraMsg integration.
    Cleans phone numbers (removes spaces/dashes) and simulates sending.
    """
    # Sanitize phone number (removes spaces like '+91 98765' -> '+9198765')
    clean_phone = phone.replace(" ", "").replace("-", "")
    
    # Example for Twilio or production gateway integration:
    # response = requests.post("https://api.whatsapp.provider/send", json={"to": clean_phone, "body": message})
    # return response.status_code == 200
    
    print(f"[WhatsApp Mock Gateway] Sending to {clean_phone}: '{message}'")
    return True


# --- Endpoints ---
@router.post("/send-project")
def send_project_notification(payload: WhatsAppProjectRequest):
    """Send automated project reminder message to a parent."""
    message = (
        f"Hello! This is a reminder regarding {payload.student_name}. "
        f"They have been assigned the project '{payload.project_title}'. "
        f"Please encourage them to submit it on time."
    )

    success = send_whatsapp_gateway(payload.phone, message)
    log_status = "sent" if success else "failed"

    log_entry = {
        "id": str(uuid.uuid4()),
        "phone": payload.phone,
        "message": message,
        "status": log_status,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    db_whatsapp_logs.insert(0, log_entry)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

    return {"status": "success", "message": "Notification sent successfully"}


@router.post("/send-attendance")
def send_attendance_notification(payload: WhatsAppAttendanceRequest):
    """Send automated attendance update to parent."""
    status_formatted = payload.status.capitalize()
    message = (
        f"Attendance Update: Your child {payload.student_name} was marked "
        f"*{status_formatted}* for class on {payload.date}."
    )

    success = send_whatsapp_gateway(payload.phone, message)
    log_status = "sent" if success else "failed"

    log_entry = {
        "id": str(uuid.uuid4()),
        "phone": payload.phone,
        "message": message,
        "status": log_status,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    db_whatsapp_logs.insert(0, log_entry)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

    return {"status": "success", "message": "Attendance notification sent"}


@router.post("/send-custom")
def send_custom_message(payload: WhatsAppCustomRequest):
    """Send custom broadcast or individual WhatsApp message."""
    success = send_whatsapp_gateway(payload.phone, payload.message)
    log_status = "sent" if success else "failed"

    log_entry = {
        "id": str(uuid.uuid4()),
        "phone": payload.phone,
        "message": payload.message,
        "status": log_status,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    db_whatsapp_logs.insert(0, log_entry)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

    return {"status": "success", "message": "Custom message sent"}


@router.get("/logs", response_model=List[LogResponse])
def get_whatsapp_logs():
    """Get history of sent WhatsApp messages."""
    return db_whatsapp_logs