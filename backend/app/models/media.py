from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.db import Base

class Media(Base):
    __tablename__ = "media"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    type = Column(String)
    url = Column(String)
    sent = Column(Boolean, default=False)