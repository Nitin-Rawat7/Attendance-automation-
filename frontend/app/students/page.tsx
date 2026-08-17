"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, Edit, Search } from "lucide-react";

type Student = {
  id: number;
  name: string;
  course_id: number;
  course_name: string;
  parent_whatsapp: string;
};

const COURSES = [
  { id: 1, name: "Robotics" },
  { id: 2, name: "AI & ML" },
  { id: 3, name: "Programming" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [name, setName] = useState<string>("");
  const [courseId, setCourseId] = useState<number>(1); // Default to first course
  const [parentWhatsapp, setParentWhatsapp] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/students/`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenModal = (student: Student | null = null) => {
    setEditingStudent(student);
    setName(student?.name || "");
    // Ensure courseId falls back to 1 if student.course_id is missing/null
    setCourseId(student?.course_id ? Number(student.course_id) : 1);
    setParentWhatsapp(student?.parent_whatsapp || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !parentWhatsapp.trim()) return;

    setSubmitting(true);
    try {
      const isEdit = !!editingStudent;
      const url = isEdit
        ? `${API_BASE_URL}/students/${editingStudent.id}`
        : `${API_BASE_URL}/students/`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          course_id: Number(courseId), // Explicitly sending the selected course ID
          parent_whatsapp: parentWhatsapp,
        }),
      });

      if (!res.ok) throw new Error("Operation failed");

      setShowModal(false);
      fetchStudents();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (studentId: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchStudents();
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_whatsapp.includes(searchQuery);
    const matchesCourse = selectedCourseId === "all" || Number(s.course_id) === selectedCourseId;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-xs text-gray-500">Manage enrolled students, courses, and parent contact details</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs cursor-pointer transition shadow-xs"
        >
          <UserPlus size={16} /> Add New Student
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) =>
              setSelectedCourseId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-gray-700"
          >
            <option value="all">All Courses</option>
            {COURSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Parent WhatsApp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {student.name}
                      <div className="text-[10px] text-gray-400 font-normal">ID: #{student.id}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-600">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[11px]">
                        {student.course_name ||
                          COURSES.find((c) => c.id === Number(student.course_id))?.name ||
                          "Unassigned"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {student.parent_whatsapp}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-xs font-medium cursor-pointer transition border border-gray-200"
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium cursor-pointer transition border border-red-200"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {editingStudent ? "Edit Student" : "Add New Student"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Course Selection Field */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Course</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Parent WhatsApp Number</label>
                <input
                  type="text"
                  required
                  value={parentWhatsapp}
                  onChange={(e) => setParentWhatsapp(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Saving..." : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}