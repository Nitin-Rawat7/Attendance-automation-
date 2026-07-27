from sqlalchemy import Column, Integer, String, ForeignKey
from app.db import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    name = Column(String)
    status = Column(String, default="pending")