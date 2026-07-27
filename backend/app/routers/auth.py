from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.models.admin import Admin
from app.config import settings
from sqlalchemy import func
from app.services.auth import (
    create_access_token,
    hash_password,
    verify_password,
    verify_super_admin,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class AdminCreate(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    if payload.username.lower() == settings.SUPER_ADMIN_USERNAME.lower() and payload.password == settings.SUPER_ADMIN_PASSWORD:
        token = create_access_token(payload.username, is_super_admin=True)
        return {"access_token": token, "is_super_admin": True}

    admin = db.query(Admin).filter(func.lower(Admin.username) == payload.username.lower()).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(401, "Invalid username or password")

    token = create_access_token(admin.username, is_super_admin=admin.is_super_admin)
    return {"access_token": token, "is_super_admin": admin.is_super_admin}

@router.post("/admins")
def create_admin(payload: AdminCreate, db: Session = Depends(get_db), _=Depends(verify_super_admin)):
    existing = db.query(Admin).filter(Admin.username == payload.username).first()
    if existing:
        raise HTTPException(400, "Username already exists")

    admin = Admin(username=payload.username, password_hash=hash_password(payload.password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"ok": True, "admin_id": admin.id}


@router.get("/admins")
def list_admins(db: Session = Depends(get_db), _=Depends(verify_super_admin)):
    admins = db.query(Admin).all()
    return [{"id": a.id, "username": a.username, "is_super_admin": a.is_super_admin} for a in admins]


@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db), _=Depends(verify_super_admin)):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(404, "Admin not found")
    db.delete(admin)
    db.commit()
    return {"ok": True}