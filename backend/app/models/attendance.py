from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(Date, server_default=func.current_date())
    status = Column(String)