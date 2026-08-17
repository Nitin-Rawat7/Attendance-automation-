"use client";

import { useEffect, useState } from "react";
import { User, FileText, Send, Award, Calendar, BarChart3 } from "lucide-react";

type Student = {
  id: number;
  name: string;
  course_id: number;
  course_name: string;
  parent_whatsapp: string;
};

type ReportData = {
  student_id: number;
  student_name: string;
  course_name: string;
  parent_whatsapp: string;
  attendance: { total_days: number; present_days: number; percentage: number };
  topics: { total: number; completed: number; percentage: number };
  projects: { total: number; completed: number; percentage: number };
  ai_summary: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${API}/students/`)
      .then((res) => res.json())
      .then((data: Student[]) => {
        setStudents(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) setSelectedStudentId(data[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    fetch(`${API}/reports/student/${selectedStudentId}`)
      .then((res) => res.json())
      .then((data: ReportData) => setReport(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  const handleSendWhatsApp = async () => {
    if (!selectedStudentId || !report) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/reports/student/${selectedStudentId}/send-whatsapp`, { method: "POST" });
      alert(res.ok ? `Progress report sent to ${report.parent_whatsapp} via WhatsApp!` : "Failed to send WhatsApp report.");
    } catch (err) {
      console.error(err);
      alert("Error sending report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Progress Reports</h1>
          <p className="text-xs text-gray-500">Generate performance summaries and issue parent report cards</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 shadow-xs">
          <User size={16} className="text-gray-400" />
          <select
            value={selectedStudentId || ""}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.course_name})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-gray-400">Generating progress report...</div>
      ) : !report ? (
        <div className="p-12 text-center text-sm text-gray-400">Select a student to view their report.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Attendance Rate</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{report.attendance.percentage}%</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{report.attendance.present_days} of {report.attendance.total_days} sessions attended</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={22} /></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Topic Mastery</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{report.topics.percentage}%</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{report.topics.completed} of {report.topics.total} curriculum topics finished</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BarChart3 size={22} /></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Projects Built</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{report.projects.percentage}%</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{report.projects.completed} of {report.projects.total} practical projects completed</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Award size={22} /></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Parent Performance Card</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">Automated Summary</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200/60 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-line">
              {report.ai_summary}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSendWhatsApp}
                disabled={sending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
              >
                <Send size={15} /> {sending ? "Sending WhatsApp..." : "Send Report Card to Parent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}