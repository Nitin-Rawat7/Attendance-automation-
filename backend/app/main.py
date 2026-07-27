from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import whatsapp_webhook
from app.routers import attendance, topics, projects, media, dashboard, students, courses

app = FastAPI(title="Attendance System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attendance.router)
app.include_router(topics.router)
app.include_router(projects.router)
app.include_router(media.router)
app.include_router(dashboard.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(whatsapp_webhook.router)

@app.get("/health")
def health():
    return {"status": "ok"}