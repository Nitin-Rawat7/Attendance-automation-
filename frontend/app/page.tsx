"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  CalendarCheck,
  UserX,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import { InteractiveRobotSpline } from "@/components/blocks/interactive-3d-robot";
import LoadingSpinner from "@/components/LoadingSpinner";

type StudentRow = {
  id: number;
  name: string;
  course_id?: number;
  course_name: string;
  parent_whatsapp?: string;
  total_classes: number;
  remaining_classes: number;
};

type CourseRow = {
  id: number;
  name: string;
};

export default function Dashboard() {
  const [summary, setSummary] = useState({
    total_students: 0,
    today_present: 0,
    today_absent: 0,
    topics_completed: 0,
  });

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    course_id: "",
    parent_whatsapp: "",
    total_classes: "",
    remaining_classes: "",
  });

  // Prevent duplicate attendance requests
  const attendanceRequestRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    course_id: "",
    parent_whatsapp: "",
    total_classes: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  const loadData = async () => {
    setLoading(true);

    const [summaryRes, studentsRes] = await Promise.all([
      fetch(`${API}/dashboard/summary`)
        .then((r) => r.json())
        .catch(() => null),

      fetch(`${API}/students/`)
        .then((r) => r.json())
        .catch(() => []),
    ]);

    if (summaryRes) {
      setSummary(summaryRes);
    }

    setStudents(studentsRes);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    fetch(`${API}/courses/`)
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => {});
  }, []);

  const markAttendance = async (
    studentId: number,
    status: "present" | "absent"
  ) => {
    if (attendanceRequestRef.current === studentId) return;

    attendanceRequestRef.current = studentId;
    setLoadingId(studentId);

    try {
      const res = await fetch(
        `${API}/attendance/${studentId}/mark?status=${status}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Something went wrong");
      } else {
        await loadData();
      }
    } catch (error) {
      console.error("[attendance] request failed:", error);
      alert("Could not reach server");
    } finally {
      attendanceRequestRef.current = null;
      setLoadingId(null);
    }
  };

  // --- DELETE STUDENT ---
  const handleDeleteStudent = async (studentId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`${API}/students/${studentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete student");
      }
    } catch (error) {
      alert("Error deleting student");
    }
  };

  // --- OPEN EDIT MODAL & FILL ALL FIELDS ---
  const handleOpenEdit = (s: StudentRow) => {
    setEditingStudent(s);
    setEditForm({
      name: s.name || "",
      course_id: s.course_id ? String(s.course_id) : "",
      parent_whatsapp: s.parent_whatsapp || "",
      total_classes: String(s.total_classes ?? 0),
      remaining_classes: String(s.remaining_classes ?? 0),
    });
  };

  // --- SUBMIT EDIT STUDENT ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API}/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          course_id: Number(editForm.course_id),
          parent_whatsapp: editForm.parent_whatsapp,
          total_classes: Number(editForm.total_classes),
          remaining_classes: Number(editForm.remaining_classes),
        }),
      });

      if (res.ok) {
        setEditingStudent(null);
        await loadData();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to update student details");
      }
    } catch (error) {
      alert("Error updating student");
    } finally {
      setSubmitting(false);
    }
  };

  // --- ADD STUDENT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.name ||
      !form.course_id ||
      !form.parent_whatsapp ||
      !form.total_classes
    ) {
      alert("Please fill all fields");
      return;
    }

    setSubmitting(true);

    const res = await fetch(`${API}/students/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        course_id: Number(form.course_id),
        parent_whatsapp: form.parent_whatsapp,
        total_classes: Number(form.total_classes),
        remaining_classes: Number(form.total_classes),
      }),
    });

    if (res.ok) {
      setForm({
        name: "",
        course_id: "",
        parent_whatsapp: "",
        total_classes: "",
      });

      setShowForm(false);
      loadData();
    } else {
      alert("Failed to add student");
    }

    setSubmitting(false);
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-8">
        {/* WELCOME HEADING */}
        <h2
          className="text-center text-[32px] mb-[6px]"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          <span className="text-[var(--ink)]">Welcome, </span>
          <span style={{ color: "#A855F7" }}>Sir</span>
        </h2>

        {/* ROBOT BANNER */}
        <div className="bg-[var(--panel)] glow-border rounded-2xl mb-9 h-[210px] flex items-center justify-center relative overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full opacity-70"
            viewBox="0 0 900 180"
            preserveAspectRatio="none"
          >
            <g stroke="#A78BFA" strokeWidth="1" fill="none">
              <path d="M0 40 H120 M120 40 L145 25 H230" />
              <path d="M0 80 H90 M90 80 L70 95 H190" />
              <path d="M0 130 H150 M150 130 L175 145 H260" />
              <path d="M950 40 H780 M780 40 L755 25 H670" />
              <path d="M950 80 H810 M810 80 L830 95 H710" />
              <path d="M950 130 H750 M750 130 L725 145 H640" />
            </g>
            <g fill="#A78BFA">
              <circle cx="120" cy="40" r="3" />
              <circle cx="230" cy="25" r="3" />
              <circle cx="90" cy="80" r="3" />
              <circle cx="190" cy="95" r="3" />
              <circle cx="150" cy="130" r="3" />
              <circle cx="260" cy="145" r="3" />
              <circle cx="780" cy="40" r="3" />
              <circle cx="670" cy="25" r="3" />
              <circle cx="810" cy="80" r="3" />
              <circle cx="710" cy="95" r="3" />
              <circle cx="750" cy="130" r="3" />
              <circle cx="640" cy="145" r="3" />
            </g>
          </svg>

          <div className="w-full max-w-[300px] h-[220px] relative z-10 ml-8">
            <InteractiveRobotSpline
              scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="flex gap-[8px] mb-6 flex-wrap">
          <StatCard
            icon={Users}
            value={summary.total_students}
            label="Total Students"
            accent="#A855F7"
          />
          <StatCard
            icon={CalendarCheck}
            value={summary.today_present}
            label="Present Today"
            accent="#39FF88"
          />
          <StatCard
            icon={UserX}
            value={summary.today_absent}
            label="Absent Today"
            accent="#FF3B6E"
          />
          <StatCard
            icon={BookOpen}
            value={summary.topics_completed}
            label="Topics Completed"
            accent="#00E5FF"
          />
        </div>

        {/* STUDENT ROSTER */}
        <div className="bg-[var(--panel)] glow-border rounded-xl p-5">
          {/* ROSTER HEADER */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-[var(--ink)] tracking-wide flex items-center gap-2">
              <span
                className="w-1 h-5 rounded-full"
                style={{ background: "#A855F7" }}
              />
              <span className="text-[var(--ink)]">STUDENT </span>
              <span style={{ color: "#A855F7" }}>ROSTER</span>
            </h3>

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: showForm ? "var(--panel-light)" : "#A855F7",
                color: showForm ? "#A855F7" : "#fff",
              }}
            >
              <Plus size={14} />
              {showForm ? "CANCEL" : "ADD STUDENT"}
            </button>
          </div>

          {/* ADD STUDENT FORM */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-[var(--panel-light)] rounded-xl p-5 mb-5 grid grid-cols-2 gap-4"
            >
              <div>
                <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  placeholder="Student name"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">
                  Course
                </label>
                <select
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value })
                  }
                  className="w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">
                  Parent WhatsApp
                </label>
                <input
                  value={form.parent_whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, parent_whatsapp: e.target.value })
                  }
                  className="w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  placeholder="919876543210"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">
                  Total Classes
                </label>
                <input
                  type="number"
                  value={form.total_classes}
                  onChange={(e) =>
                    setForm({ ...form, total_classes: e.target.value })
                  }
                  className="w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  placeholder="72"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#A855F7", color: "#fff" }}
                >
                  {submitting ? "ADDING..." : "SAVE STUDENT"}
                </button>
              </div>
            </form>
          )}

          {/* TABLE */}
          {loading ? (
            <LoadingSpinner />
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr
                  className="text-left border-b-2 border-[var(--border)] uppercase text-xs tracking-wider"
                  style={{ color: "#A855F7" }}
                >
                  <th className="py-2 font-semibold">Name</th>
                  <th className="font-semibold">Course</th>
                  <th className="font-semibold">Remaining Classes</th>
                  <th className="font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b-2"
                    style={{
                      borderBottomColor: "rgba(168, 85, 247, 0.35)",
                    }}
                  >
                    <td className="py-4 font-semibold text-[var(--ink)]">
                      {s.name}
                    </td>

                    <td className="text-[var(--ink-dim)]">{s.course_name}</td>

                    <td className="text-[var(--ink-dim)]">
                      {s.remaining_classes} / {s.total_classes}
                    </td>

                    <td className="py-3">
                      <span className="inline-flex items-center gap-2">
                        {/* PRESENT */}
                        <button
                          type="button"
                          disabled={loadingId === s.id}
                          onClick={() => markAttendance(s.id, "present")}
                          className="px-3 py-1.5 rounded-full bg-[var(--panel-light)] border border-[#39FF88]/40 text-[#39FF88] text-xs font-semibold hover:bg-[#39FF88]/10 disabled:opacity-50"
                        >
                          {loadingId === s.id ? "..." : "PRESENT"}
                        </button>

                        {/* ABSENT */}
                        <button
                          type="button"
                          disabled={loadingId === s.id}
                          onClick={() => markAttendance(s.id, "absent")}
                          className="px-3 py-1.5 rounded-full bg-[var(--panel-light)] border border-[#FF3B6E]/40 text-[#FF3B6E] text-xs font-semibold hover:bg-[#FF3B6E]/10 disabled:opacity-50"
                        >
                          {loadingId === s.id ? "..." : "ABSENT"}
                        </button>

                        {/* EDIT BUTTON - LIGHT BRIGHT GREEN */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg bg-[var(--panel-light)] border border-[#39FF88]/40 text-[#39FF88] hover:bg-[#39FF88]/20 transition"
                          title="Edit Student"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* DELETE BUTTON - LIGHT BRIGHT RED */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                          className="p-1.5 rounded-lg bg-[var(--panel-light)] border border-[#FF3B6E]/40 text-[#FF3B6E] hover:bg-[#FF3B6E]/20 transition"
                          title="Delete Student"
                        >
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* EDIT MODAL */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg shadow-xl relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-[var(--ink)]">
                  Edit Student Details
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="text-[var(--ink-dim)] hover:text-[var(--ink)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-[var(--ink-dim)] uppercase">
                    Student Name
                  </label>
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--ink-dim)] uppercase">
                    Course
                  </label>
                  <select
                    required
                    value={editForm.course_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, course_id: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--ink-dim)] uppercase">
                    Parent WhatsApp
                  </label>
                  <input
                    required
                    value={editForm.parent_whatsapp}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        parent_whatsapp: e.target.value,
                      })
                    }
                    className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--ink-dim)] uppercase">
                    Total Classes
                  </label>
                  <input
                    required
                    type="number"
                    value={editForm.total_classes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, total_classes: e.target.value })
                    }
                    className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--ink-dim)] uppercase">
                    Remaining Classes
                  </label>
                  <input
                    required
                    type="number"
                    value={editForm.remaining_classes}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        remaining_classes: e.target.value,
                      })
                    }
                    className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 rounded-lg text-sm bg-[var(--panel-light)] text-[var(--ink)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "#A855F7" }}
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}