from sqlalchemy import Column, Integer, String, ForeignKey
from app.db import Base

class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    name = Column(String)
    status = Column(String, default="pending")