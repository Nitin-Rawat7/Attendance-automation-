# Student Attendance & Curriculum Automation System

A full-stack web application designed to manage student profiles, track attendance, curriculum topics, project milestones, and automate media updates (photos/videos) sharing directly to parents via WhatsApp.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React / TypeScript), Tailwind CSS, Lucide Icons / Custom UI components
* **Backend:** FastAPI (Python), Uvicorn, SQLAlchemy, SQLite/PostgreSQL
* **Integration / Automation:** Supabase Edge Functions, WhatsApp API integration

---

## 📁 Project Structure

```text
Student attendance automation/
├── backend/
│   ├── app/
│   │   ├── models/       # Database models (Student, Attendance, Media, etc.)
│   │   └── routers/      # API Endpoints (students, media, attendance, etc.)
│   ├── uploads/          # Local storage for uploaded student project media
│   ├── main.py           # FastAPI entry point
│   └── requirements.txt  # Python dependencies
└── frontend/
    ├── components/       # UI Components (e.g., GalleryView.tsx)
    └── ...

cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
BASE_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
SUPABASE_URL=your_supabase_edge_function_url
SUPABASE_KEY=your_supabase_anon_key
uvicorn app.main:app --reload

npm install
NEXT_PUBLIC_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
npm run dev