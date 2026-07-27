from pydantic import BaseModel

class MediaCreate(BaseModel):
    student_id: int
    type: str   # "video" or "photo"
    url: str