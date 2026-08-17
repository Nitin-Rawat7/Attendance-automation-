"use client";

import { useState, useEffect } from "react";

type CourseTopic = { id: number; name: string };
type Student = { id: number; name: string; parent_whatsapp?: string; course_id?: number };

const COURSES = [
  { id: 1, name: "Robotics" },
  { id: 2, name: "AI" },
  { id: 3, name: "Programming" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function TopicsPage() {
  const [selectedCourse, setSelectedCourse] = useState<number>(1);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // General Action Student Selector State
  const [globalStudentId, setGlobalStudentId] = useState<number | "">("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Student Topic Progress Map (topic_id -> status) for tick marks
  const [studentProgressMap, setStudentProgressMap] = useState<Record<number, string>>({});

  // Topic Add/Edit Modal
  const [showTopicModal, setShowTopicModal] = useState<boolean>(false);
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [submittingTopic, setSubmittingTopic] = useState<boolean>(false);

  // Topic Marking Modal
  const [showMarkingModal, setShowMarkingModal] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<CourseTopic | null>(null);
  const [markingStudentId, setMarkingStudentId] = useState<number | "">("");
  const [topicStatus, setTopicStatus] = useState<string>("pending");
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Project Completion Modal / Input
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>("Final Robot Assembly");

  const fetchStudentProgress = async (studentId: number) => {
    try {
      const res = await fetch(`${API}/students/${studentId}/topics`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<number, string> = {};
        data.forEach((item: any) => {
          map[item.topic_id] = item.status;
        });
        setStudentProgressMap(map);
      }
    } catch {
      setStudentProgressMap({});
    }
  };

  const fetchData = async (courseId: number) => {
    setLoading(true);
    try {
      const [topicsRes, studentsRes] = await Promise.all([
        fetch(`${API}/students/course/${courseId}/topics`),
        fetch(`${API}/students/?course_id=${courseId}`)
      ]);
      
      const topicsData = await topicsRes.json();
      const studentsData = await studentsRes.json();

      setTopics(Array.isArray(topicsData) ? topicsData : []);
      const studentList = Array.isArray(studentsData) ? studentsData : [];
      setStudents(studentList);

      if (studentList.length > 0) {
        const firstId = studentList[0].id;
        setGlobalStudentId(firstId);
        fetchStudentProgress(firstId);
      } else {
        setGlobalStudentId("");
        setStudentProgressMap({});
      }
    } catch (err) {
      console.error(err);
      setTopics([]);
      setStudents([]);
      setStudentProgressMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCourse);
  }, [selectedCourse]);

  useEffect(() => {
    if (globalStudentId) {
      fetchStudentProgress(Number(globalStudentId));
    } else {
      setStudentProgressMap({});
    }
  }, [globalStudentId]);

  const triggerNotification = async (endpoint: string, actionKey: string, successMsg: string, extraBody?: object) => {
    if (!globalStudentId) {
      alert("Please select a student first.");
      return;
    }
    setActionLoading(actionKey);
    try {
      const res = await fetch(`${API}/students/${globalStudentId}/${endpoint}`, {
        method: "POST",
        headers: extraBody ? { "Content-Type": "application/json" } : undefined,
        body: extraBody ? JSON.stringify(extraBody) : undefined,
      });
      if (!res.ok) throw new Error("Failed to send notification");
      alert(successMsg);
    } catch (err: any) {
      alert(err.message || "Error sending notification");
    } finally {
      setActionLoading(null);
    }
  };

  const checkTopicStatus = async (studentId: number, topicId: number) => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/topics`);
      const data = await res.json();
      const found = Array.isArray(data) && data.find((t: any) => t.topic_id === topicId);
      setTopicStatus(found ? found.status : "pending");
    } catch {
      setTopicStatus("pending");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleOpenMarking = (topic: CourseTopic) => {
    setSelectedTopic(topic);
    setShowMarkingModal(true);
    const initialSid = globalStudentId || (students.length > 0 ? students[0].id : "");
    if (initialSid) {
      setMarkingStudentId(initialSid);
      checkTopicStatus(Number(initialSid), topic.id);
    }
  };

  const handleCompleteTopic = async () => {
    if (!markingStudentId || !selectedTopic) return;
    setActionLoading("topic_complete");
    try {
      const res = await fetch(`${API}/students/${markingStudentId}/topics/${selectedTopic.id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      
      setTopicStatus("completed");
      
      fetchStudentProgress(Number(markingStudentId));
      if (globalStudentId) {
        fetchStudentProgress(Number(globalStudentId));
      }

      setShowMarkingModal(false);
      alert("Topic marked complete & 'topic_complete' WhatsApp template sent to parent!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName) return;
    setSubmittingTopic(true);
    const isEdit = !!editingTopic;
    const url = isEdit ? `${API}/students/course/${selectedCourse}/topics/${editingTopic.id}` : `${API}/students/course/${selectedCourse}/add-topic`;
    
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { name: topicName } : { course_id: selectedCourse, name: topicName }),
      });
      if (!res.ok) throw new Error("Operation failed");
      setShowTopicModal(false);
      fetchData(selectedCourse);
    } catch (err:any) {
      alert(err.message);
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    try {
      const res = await fetch(`${API}/students/course/${selectedCourse}/topics/${topicId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchData(selectedCourse);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum & Class Management</h1>
          <p className="text-xs text-gray-500">Manage course modules and trigger distinct parent WhatsApp templates</p>
        </div>
        <button
          onClick={() => { setEditingTopic(null); setTopicName(""); setShowTopicModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs cursor-pointer shadow-xs"
        >
          + Add Course Topic
        </button>
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        {COURSES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCourse(c.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
              selectedCourse === c.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Live Session Quick Actions ({COURSES.find(c => c.id === selectedCourse)?.name})</h2>
            <p className="text-xs text-gray-500">Select a student to view their completion checkmarks and trigger actions.</p>
          </div>
          <div>
            {students.length === 0 ? (
              <span className="text-xs text-red-500 font-medium">No students in this course.</span>
            ) : (
              <select
                value={globalStudentId}
                onChange={(e) => setGlobalStudentId(Number(e.target.value))}
                className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => triggerNotification("attendance-present", "attendance", "Attendance Present notification sent successfully!")}
            disabled={actionLoading !== null || students.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>👤</span>
            <span>{actionLoading === "attendance" ? "Sending..." : "Mark Attendance (attendance_present)"}</span>
          </button>

          <button
            onClick={() => triggerNotification("class-complete", "class", "Class Complete notification sent successfully!")}
            disabled={actionLoading !== null || students.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>📚</span>
            <span>{actionLoading === "class" ? "Sending..." : "Mark Class Complete (class_complete)"}</span>
          </button>

          <button
            onClick={() => setShowProjectModal(true)}
            disabled={actionLoading !== null || students.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>🚀</span>
            <span>Trigger Project Completed (project_completed)</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Course Curriculum Topics & Topic Marking</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Loading topics...</div>
          ) : topics.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">No topics added for this course yet.</div>
          ) : (
            topics.map((t) => {
              const isCompleted = studentProgressMap[t.id] === "completed";
              return (
                <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 relative">
                  {isCompleted && (
                    <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-2xs">
                      <span>✓</span>
                      <span>Completed</span>
                    </span>
                  )}

                  <div>
                    <span className="text-xs font-mono text-gray-400">#Topic {t.id}</span>
                    <h3 className="font-semibold text-gray-900 text-base mt-1 pr-20">{t.name}</h3>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenMarking(t)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs flex items-center justify-center space-x-1"
                    >
                      <span>✅</span>
                      <span>Mark Topic & Send `topic_complete`</span>
                    </button>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button onClick={() => { setEditingTopic(t); setTopicName(t.name); setShowTopicModal(true); }} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium cursor-pointer">Edit</button>
                      <button onClick={() => handleDeleteTopic(t.id)} className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium cursor-pointer">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showTopicModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{editingTopic ? "Edit Topic" : "Add Course Topic"}</h2>
            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. Ultrasonic Sensor Logic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTopicModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submittingTopic} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer shadow-xs">{submittingTopic ? "Saving..." : "Save Topic"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMarkingModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark Topic Complete</h2>
                <p className="text-xs text-gray-500 mt-0.5">Topic: <span className="font-semibold text-gray-700">{selectedTopic.name}</span></p>
              </div>
              <button onClick={() => setShowMarkingModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Student:</label>
                <select
                  value={markingStudentId}
                  onChange={(e) => {
                    const sid = Number(e.target.value);
                    setMarkingStudentId(sid);
                    checkTopicStatus(sid, selectedTopic.id);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">Current Status:</span>
                <span className="text-xs font-semibold">
                  {loadingStatus ? "Loading..." : topicStatus === "completed" ? (
                    <span className="text-green-600 font-bold">✓ Completed</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowMarkingModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer">Close</button>
              <button
                type="button"
                onClick={handleCompleteTopic}
                disabled={actionLoading === "topic_complete" || topicStatus === "completed"}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium cursor-pointer shadow-xs"
              >
                {actionLoading === "topic_complete" ? "Sending..." : "Mark Complete & Send `topic_complete`"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Trigger Project Completed</h2>
              <button onClick={() => setShowProjectModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowProjectModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  triggerNotification("project-complete", "project", "Project Completed notification sent successfully!", { project_name: projectName });
                  setShowProjectModal(false);
                }}
                disabled={actionLoading === "project"}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium cursor-pointer shadow-xs"
              >
                {actionLoading === "project" ? "Sending..." : "Send `project_completed`"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}