import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routers.students import router as student_router
from app.routers.topics import router as topics_router
from app.routers.projects import router as projects_router
from app.routers.media import router as media_router
from app.routers.attendance import router as attendance_router
from app.routers.reports import router as reports_router

app = FastAPI(
    title="Student Attendance & Curriculum Automation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup uploads directory and mount static files
UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(student_router)
app.include_router(topics_router)
app.include_router(projects_router)
app.include_router(media_router)
app.include_router(attendance_router)
app.include_router(reports_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"status": "online", "message": "API is running"}