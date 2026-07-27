from sqlalchemy import Column, Integer, String, ForeignKey
from app.db import Base

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    course_id = Column(Integer, ForeignKey("courses.id"))
    parent_whatsapp = Column(String)
    total_classes = Column(Integer, default=0)
    remaining_classes = Column(Integer, default=0)