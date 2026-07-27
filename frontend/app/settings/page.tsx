"use client";
import { useEffect, useState } from "react";
import { Plus, GraduationCap, Wifi, MessageCircle, UserPlus, Trash2, Shield } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import LoadingSpinner from "@/components/LoadingSpinner";

type CourseRow = { id: number; name: string };
type AdminRow = { id: number; username: string; is_super_admin: boolean };

export default function SettingsPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const accent = "#A78BFA";

  const loadCourses = () => {
    setLoading(true);
    fetch(`${API}/courses/`,)
      .then((r) => r.json())
      .then(setCourses)
      .finally(() => setLoading(false));
  };

  const loadAdmins = () => {
    fetch(`${API}/auth/admins`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAdmins)
      .catch(() => {});
  };

  useEffect(() => {
    loadCourses();
    setIsSuperAdmin(localStorage.getItem("is_super_admin") === "true");
    fetch(`${API}/health`)
      .then((r) => (r.ok ? setApiStatus("online") : setApiStatus("offline")))
      .catch(() => setApiStatus("offline"));
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadAdmins();
  }, [isSuperAdmin]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.trim()) return;
    setSubmitting(true);
    const res = await fetch(`${API}/courses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify({ name: newCourse.trim() }),
    });
    if (res.ok) {
      setNewCourse("");
      loadCourses();
    } else {
      alert("Failed to add course");
    }
    setSubmitting(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.password) return alert("Fill all fields");
    setAddingAdmin(true);
    const res = await fetch(`${API}/auth/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify(adminForm),
    });
    if (res.ok) {
      setAdminForm({ username: "", password: "" });
      setShowAdminForm(false);
      loadAdmins();
    } else {
      const data = await res.json();
      alert(data.detail || "Failed to add admin");
    }
    setAddingAdmin(false);
  };

  const deleteAdmin = async (id: number) => {
    if (!confirm("Remove this admin's access?")) return;
    await fetch(`${API}/auth/admins/${id}`, { method: "DELETE" });
    loadAdmins();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold tracking-wide" style={{ color: accent }}>
            SETTINGS
          </h2>
          <p className="text-[var(--ink-dim)] text-sm mt-1">Manage courses and system configuration</p>
        </div>

        <div className="bg-[var(--panel)] glow-border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
            <Wifi size={16} style={{ color: accent }} />
            System Status
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--panel-light)] rounded-xl p-4 flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: apiStatus === "online" ? "#4ADE9C" : apiStatus === "offline" ? "#FB7185" : "#FBBF6B" }}
              />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Backend API</p>
                <p className="text-xs text-[var(--ink-dim)] capitalize">{apiStatus}</p>
              </div>
            </div>
            <div className="bg-[var(--panel-light)] rounded-xl p-4 flex items-center gap-3">
              <MessageCircle size={18} style={{ color: "#4ADE9C" }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">WhatsApp Notifications</p>
                <p className="text-xs text-[var(--ink-dim)]">Active via Activepieces</p>
              </div>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="bg-[var(--panel)] glow-border rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[var(--ink)] flex items-center gap-2">
                <Shield size={16} style={{ color: accent }} />
                Admins
              </h3>
              <button
                onClick={() => setShowAdminForm(!showAdminForm)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: "var(--panel-light)", border: `1px solid ${accent}50`, color: accent }}
              >
                <UserPlus size={14} />
                {showAdminForm ? "CANCEL" : "ADD ADMIN"}
              </button>
            </div>

            {showAdminForm && (
              <form onSubmit={handleAddAdmin} className="flex gap-3 mb-5 flex-wrap">
                <input
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  placeholder="Username"
                  className="flex-1 min-w-[160px] bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--ink)]"
                />
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="Password"
                  className="flex-1 min-w-[160px] bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--ink)]"
                />
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: accent, color: "#0A0E17" }}
                >
                  {addingAdmin ? "ADDING..." : "CREATE"}
                </button>
              </form>
            )}

            <div className="flex flex-col gap-2">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-[var(--panel-light)] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{a.username}</p>
                    {a.is_super_admin && <p className="text-[10px] text-[var(--ink-dim)]">Super Admin</p>}
                  </div>
                  {!a.is_super_admin && (
                    <button onClick={() => deleteAdmin(a.id)} className="text-[var(--ink-dim)] hover:text-[#FB7185]">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--panel)] glow-border rounded-2xl p-5">
          <h3 className="font-display font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
            <GraduationCap size={16} style={{ color: accent }} />
            Courses
          </h3>

          <form onSubmit={handleAddCourse} className="flex gap-3 mb-5">
            <input
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              placeholder="e.g. Web Development"
              className="flex-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--ink)]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: accent, color: "#0A0E17" }}
            >
              <Plus size={16} />
              {submitting ? "ADDING..." : "ADD COURSE"}
            </button>
          </form>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="bg-[var(--panel-light)] rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-[var(--ink)]">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}