"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import LoadingSpinner from "@/components/LoadingSpinner";

type StudentRow = { id: number; name: string; course_name: string };
type ProjectRow = { project_id: number; name: string; status: string };
type CourseRow = { id: number; name: string };

export default function ProjectsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ course_id: "", name: "" });
  const [search, setSearch] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const accent = "#FB7185";

  useEffect(() => {
    fetch(`${API}/students/`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data);
        if (data.length > 0) setSelectedId(data[0].id);
      });

    fetch(`${API}/courses/`)
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => {});
  }, []);

  const loadProjects = (studentId: number) => {
    fetch(`${API}/projects/student/${studentId}`)
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  };

  useEffect(() => {
    if (selectedId) loadProjects(selectedId);
  }, [selectedId]);

  const completeProject = async (projectId: number) => {
    if (!selectedId) return;
    setActionId(projectId);

    const res = await fetch(
      `${API}/projects/${selectedId}/projects/${projectId}/complete`,
      { method: "POST" }
    );

    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) =>
          p.project_id === projectId ? { ...p, status: "completed" } : p
        )
      );
    }

    setActionId(null);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.name) return alert("Fill all fields");
    setSubmitting(true);

    const res = await fetch(`${API}/projects/course/${form.course_id}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: Number(form.course_id), name: form.name }),
    });

    if (res.ok) {
      setForm({ course_id: "", name: "" });
      setShowForm(false);
      if (selectedId) loadProjects(selectedId);
    } else {
      alert("Failed to add project");
    }

    setSubmitting(false);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold tracking-wide" style={{ color: accent }}>
            PROJECTS MODULE
          </h2>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: "var(--panel-light)", border: `1px solid ${accent}50`, color: accent }}
          >
            {showForm ? "CANCEL" : "+ ADD PROJECT"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddProject}
            className="bg-[var(--panel)] glow-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4"
          >
            <div>
              <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">Course</label>
              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
              >
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">Project Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                placeholder="e.g. Line Follower Robot"
              />
            </div>

            <div className="col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                style={{ background: accent, color: "#0A0E17" }}
              >
                {submitting ? "ADDING..." : "SAVE PROJECT"}
              </button>
            </div>
          </form>
        )}

        <div className="mb-6">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="bg-[var(--panel)] text-[var(--ink)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.course_name}</option>
            ))}
          </select>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." accent={accent} />

        <div className="bg-[var(--panel)] glow-border rounded-xl p-5">
          {loading ? (
            <LoadingSpinner />
          ) : filteredProjects.length === 0 ? (
            <p className="text-[var(--ink-dim)] text-sm text-center py-8">No projects found.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[var(--ink-dim)] border-b-2 border-[var(--border)] uppercase text-xs tracking-wider">
                  <th className="py-2 font-semibold">Project</th>
                  <th className="font-semibold">Status</th>
                  <th className="font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.project_id} className="border-b-2" style={{ borderBottomColor: "rgba(251, 113, 133, 0.35)" }}>
                    <td className="py-4 font-semibold text-[var(--ink)]">{p.name}</td>
                    <td>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-md"
                        style={{
                          color: p.status === "completed" ? "#39FF88" : "#7C8AA5",
                          background: p.status === "completed" ? "#39FF8815" : "transparent",
                        }}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        disabled={p.status === "completed" || actionId === p.project_id}
                        onClick={() => completeProject(p.project_id)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-40"
                        style={{ background: "var(--panel-light)", border: `1px solid ${accent}50`, color: accent }}
                      >
                        {p.status === "completed" ? "DONE" : "MARK COMPLETE"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}