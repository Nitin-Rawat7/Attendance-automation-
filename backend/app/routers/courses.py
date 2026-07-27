from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.models.course import Course

router = APIRouter(prefix="/courses", tags=["courses"])


class CourseCreate(BaseModel):
    name: str


@router.get("/")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    return [{"id": c.id, "name": c.name} for c in courses]


@router.post("/")
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = Course(name=payload.name)
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"ok": True, "course_id": course.id}