from sqlalchemy import Column, Integer, String, ForeignKey
from app.db import Base

class StudentProjectProgress(Base):
    __tablename__ = "student_project_progress"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    project_id = Column(Integer, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"))
    status = Column(String, default="pending")