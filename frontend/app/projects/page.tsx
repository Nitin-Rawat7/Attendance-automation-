"use client";

import { useState, useEffect } from "react";

type CourseProject = {
  id: number;
  name: string;
};

const COURSES = [
  { id: 1, name: "Robotics" },
  { id: 2, name: "AI" },
  { id: 3, name: "Programming" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ProjectsPage() {
  const [selectedCourse, setSelectedCourse] = useState<number>(1);
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<CourseProject | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchProjects = async (courseId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/students/course/${courseId}/projects`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(selectedCourse);
  }, [selectedCourse]);

  const handleOpenModal = (project: CourseProject | null = null) => {
    setEditingProject(project);
    setProjectName(project?.name || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSubmitting(true);
    try {
      const isEdit = !!editingProject;
      const url = isEdit
        ? `${API_BASE_URL}/students/course/${selectedCourse}/projects/${editingProject.id}`
        : `${API_BASE_URL}/students/course/${selectedCourse}/add-project`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: isEdit
          ? JSON.stringify({ name: projectName })
          : JSON.stringify({ course_id: selectedCourse, name: projectName }),
      });

      if (!res.ok) throw new Error("Operation failed");

      setShowModal(false);
      fetchProjects(selectedCourse);
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projectId: number) => {
    if (!confirm("Are you sure? This will remove project progress tracking for enrolled students.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/students/course/${selectedCourse}/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchProjects(selectedCourse);
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Projects</h1>
          <p className="text-xs text-gray-500">Manage course projects and auto-sync progress for students</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs cursor-pointer transition"
        >
          + Add Project
        </button>
      </div>

      {/* Course Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {COURSES.map((course) => (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              selectedCourse === course.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {course.name}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          No projects configured for this course yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-gray-300 transition"
            >
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">#Project {p.id}</span>
                <h3 className="font-semibold text-gray-900 text-base mt-1">{p.name}</h3>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenModal(p)}
                  className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium cursor-pointer transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {editingProject ? "Edit Project" : "Add Project"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Line Follower Robot"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}