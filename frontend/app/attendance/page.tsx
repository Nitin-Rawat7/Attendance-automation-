"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, XCircle, Clock, Save, Send } from "lucide-react";

type Student = {
  id: number;
  name: string;
  course_id: number;
  course_name: string;
  parent_whatsapp: string;
};

type AttendanceStatus = "present" | "absent" | "late";

type AttendanceRecord = {
  student_id: number;
  status: AttendanceStatus;
  notes?: string;
};

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [notifyParents, setNotifyParents] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Fetch students
  useEffect(() => {
    fetch(`${API}/students/`)
      .then((res) => res.json())
      .then((data: Student[]) => setStudents(data))
      .catch((err) => console.error("Error loading students:", err));
  }, [API]);

  // Fetch existing attendance records for selected date
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);

    fetch(`${API}/attendance/by-date?date=${selectedDate}`)
      .then((res) => res.json())
      .then((records: { student_id: number; status: AttendanceStatus; notes: string }[]) => {
        const initialStatus: Record<number, AttendanceStatus> = {};
        const initialNotes: Record<number, string> = {};

        records.forEach((r) => {
          initialStatus[r.student_id] = r.status;
          if (r.notes) initialNotes[r.student_id] = r.notes;
        });

        // Set default 'present' for students without records
        students.forEach((s) => {
          if (!initialStatus[s.id]) {
            initialStatus[s.id] = "present";
          }
        });

        setAttendance(initialStatus);
        setNotes(initialNotes);
      })
      .catch((err) => console.error("Error fetching attendance:", err))
      .finally(() => setLoading(false));
  }, [selectedDate, students, API]);

  const filteredStudents =
    selectedCourseId === "all"
      ? students
      : students.filter((s) => s.course_id === selectedCourseId);

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleNoteChange = (studentId: number, text: string) => {
    setNotes((prev) => ({ ...prev, [studentId]: text }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    const records: AttendanceRecord[] = filteredStudents.map((s) => ({
      student_id: s.id,
      status: attendance[s.id] || "present",
      notes: notes[s.id] || "",
    }));

    try {
      const res = await fetch(`${API}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          notify_absent_parents: notifyParents,
          records,
        }),
      });

      if (res.ok) {
        alert("Attendance recorded successfully!");
      } else {
        alert("Failed to save attendance.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
          <p className="text-xs text-gray-500">Mark daily attendance and automatically notify absent parents</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Course Filter */}
          <select
            value={selectedCourseId}
            onChange={(e) =>
              setSelectedCourseId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Courses</option>
            <option value={1}>Robotics</option>
            <option value={2}>AI & ML</option>
            <option value={3}>Programming</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {/* Actions Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyParents}
              onChange={(e) => setNotifyParents(e.target.checked)}
              className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <Send size={14} className="text-blue-600" /> Auto-send WhatsApp alerts to parents of absent students
          </label>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || filteredStudents.length === 0}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save & Notify"}
          </button>
        </div>

        {/* Student Table */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading student roster...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No students found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const currentStatus = attendance[student.id] || "present";

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {student.name}
                        <div className="text-[10px] text-gray-400 font-normal">
                          {student.parent_whatsapp}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {student.course_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center items-center gap-1.5">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "present")}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                              currentStatus === "present"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <CheckCircle2 size={13} /> Present
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "absent")}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                              currentStatus === "absent"
                                ? "bg-rose-50 border-rose-500 text-rose-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <XCircle size={13} /> Absent
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "late")}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                              currentStatus === "late"
                                ? "bg-amber-50 border-amber-500 text-amber-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <Clock size={13} /> Late
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional note..."
                          value={notes[student.id] || ""}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}