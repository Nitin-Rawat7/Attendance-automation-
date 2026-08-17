"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import DashboardView from "@/components/DashboardView";
import TopicsView from "@/components/TopicsView";
import ProjectsView from "@/components/ProjectsView";
import StudentsView from "@/components/StudentsView";
import GalleryView from "@/components/GalleryView";
import TopicModal from "@/components/TopicModal";
import MarkingModal from "@/components/MarkingModal";
import EditStudentModal from "@/components/EditStudentModal";

export type CourseTopic = { id: number; name: string };
export type CourseProject = { id: number; name: string };
export type Student = { 
  id: number; 
  name: string; 
  parent_whatsapp?: string; 
  course_id?: number; 
  total_classes?: number; 
  remaining_classes?: number; 
};

export const COURSES = [
  { id: 1, name: "Robotics" },
  { id: 2, name: "AI" },
  { id: 3, name: "Programming" },
];

export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "topics" | "projects" | "students" | "gallery">("dashboard");
  const [selectedCourse, setSelectedCourse] = useState<number>(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Search & Filter State for Students
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Global Student & Action States
  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals States for Topics
  const [showTopicModal, setShowTopicModal] = useState<boolean>(false);
  const [editingTopic, setEditingTopic] = useState<CourseTopic | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [submittingTopic, setSubmittingTopic] = useState<boolean>(false);

  // Modals States for Projects
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<CourseProject | null>(null);
  const [projectNameInput, setProjectNameInput] = useState<string>("");
  const [submittingProject, setSubmittingProject] = useState<boolean>(false);

  // Marking Modal States
  const [showMarkingModal, setShowMarkingModal] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<CourseTopic | null>(null);
  const [markingStudentId, setMarkingStudentId] = useState<number | "">("");
  const [topicStatus, setTopicStatus] = useState<string>("pending");
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Edit Student Modal States
  const [showEditStudentModal, setShowEditStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState<string>("");
  const [editStudentWhatsapp, setEditStudentWhatsapp] = useState<string>("");
  const [editStudentCourseId, setEditStudentCourseId] = useState<number>(1);
  const [editTotalClasses, setEditTotalClasses] = useState<number>(0);
  const [editRemainingClasses, setEditRemainingClasses] = useState<number>(0);
  const [submittingStudent, setSubmittingStudent] = useState<boolean>(false);

  const fetchData = async (courseId: number) => {
    setLoading(true);
    try {
      const [studentsRes, topicsRes, projectsRes] = await Promise.all([
        fetch(`${API}/students/?course_id=${courseId}`),
        fetch(`${API}/students/course/${courseId}/topics`),
        fetch(`${API}/students/course/${courseId}/projects`)
      ]);
      const studentsData = await studentsRes.json();
      const topicsData = await topicsRes.json();
      const projectsData = await projectsRes.json().catch(() => []);

      const studentList = Array.isArray(studentsData) ? studentsData : [];
      setStudents(studentList);
      setTopics(Array.isArray(topicsData) ? topicsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      if (studentList.length > 0) {
        setSelectedStudentId(studentList[0].id);
        setMarkingStudentId(studentList[0].id);
      } else {
        setSelectedStudentId("");
        setMarkingStudentId("");
      }
    } catch (err) {
      console.error(err);
      setStudents([]);
      setTopics([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCourse);
  }, [selectedCourse]);

  const triggerNotification = async (endpoint: string, actionKey: string, successMsg: string, extraBody?: object) => {
    if (!selectedStudentId) {
      alert("Please select a student first.");
      return;
    }
    setActionLoading(actionKey);
    try {
      const res = await fetch(`${API}/students/${selectedStudentId}/${endpoint}`, {
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

  const handleCompleteTopic = async () => {
    if (!markingStudentId || !selectedTopic) return;
    setActionLoading("topic_complete");
    try {
      const res = await fetch(`${API}/students/${markingStudentId}/topics/${selectedTopic.id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setTopicStatus("completed");
      alert("Topic marked complete & 'topic_complete' template sent to parent!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteProject = async (project: CourseProject) => {
    if (!selectedStudentId) {
      alert("Please select a student first.");
      return;
    }
    setActionLoading(`project_complete_${project.id}`);
    try {
      const res = await fetch(`${API}/students/${selectedStudentId}/project-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: project.name }),
      });
      if (!res.ok) throw new Error("Failed to send project update");
      alert(`Project '${project.name}' update sent to parent successfully!`);
    } catch (err: any) {
      alert(err.message || "Error sending project update");
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API}/students/course/${selectedCourse}/topics/${topicId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchData(selectedCourse);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameInput) return;
    setSubmittingProject(true);
    const isEdit = !!editingProject;
    const url = isEdit 
      ? `${API}/students/course/${selectedCourse}/projects/${editingProject.id}` 
      : `${API}/students/course/${selectedCourse}/add-project`;
    
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { name: projectNameInput } : { course_id: selectedCourse, name: projectNameInput }),
      });
      if (!res.ok) throw new Error("Operation failed");
      setShowProjectModal(false);
      fetchData(selectedCourse);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`${API}/students/course/${selectedCourse}/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchData(selectedCourse);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStudentUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmittingStudent(true);
    try {
      const res = await fetch(`${API}/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editStudentName, 
          parent_whatsapp: editStudentWhatsapp, 
          course_id: editStudentCourseId, 
          total_classes: editTotalClasses,
          remaining_classes: editRemainingClasses 
        }),
      });
      if (!res.ok) throw new Error("Failed to update student info");
      setShowEditStudentModal(false);
      fetchData(selectedCourse);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingStudent(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.parent_whatsapp && s.parent_whatsapp.includes(searchQuery))
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <Navbar 
          activeTab={activeTab} 
          selectedCourse={selectedCourse} 
          setSelectedCourse={setSelectedCourse} 
        />

        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {activeTab === "dashboard" && (
            <DashboardView
              students={students}
              selectedStudentId={selectedStudentId}
              setSelectedStudentId={setSelectedStudentId}
              actionLoading={actionLoading}
              triggerNotification={triggerNotification}
            />
          )}

          {activeTab === "topics" && (
            <TopicsView
              topics={topics}
              loading={loading}
              students={students}
              onAddClick={() => { setEditingTopic(null); setTopicName(""); setShowTopicModal(true); }}
              onEditClick={(t: CourseTopic) => { setEditingTopic(t); setTopicName(t.name); setShowTopicModal(true); }}
              onDeleteClick={handleDeleteTopic}
              onMarkCompleteClick={(t: CourseTopic) => {
                setSelectedTopic(t);
                setShowMarkingModal(true);
                if (students.length > 0) {
                  setMarkingStudentId(students[0].id);
                  checkTopicStatus(students[0].id, t.id);
                }
              }}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsView
              projects={projects}
              loading={loading}
              students={students}
              selectedStudentId={selectedStudentId}
              setSelectedStudentId={setSelectedStudentId}
              actionLoading={actionLoading}
              onAddClick={() => { setEditingProject(null); setProjectNameInput(""); setShowProjectModal(true); }}
              onEditClick={(p: CourseProject) => { setEditingProject(p); setProjectNameInput(p.name); setShowProjectModal(true); }}
              onDeleteClick={handleDeleteProject}
              onMarkCompleteClick={handleCompleteProject}
            />
          )}

          {activeTab === "students" && (
            <StudentsView
              students={filteredStudents}
              courses={COURSES}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEditStudent={(s: Student) => {
                setEditingStudent(s);
                setEditStudentName(s.name);
                setEditStudentWhatsapp(s.parent_whatsapp || "");
                setEditStudentCourseId(s.course_id || selectedCourse);
                setEditTotalClasses(s.total_classes ?? 0);
                setEditRemainingClasses(s.remaining_classes ?? 0);
                setShowEditStudentModal(true);
              }}
            />
          )}

          {activeTab === "gallery" && <GalleryView />}
        </div>
      </main>

      {/* Modals */}
      <TopicModal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        onSubmit={handleTopicSubmit}
        editingTopic={editingTopic}
        topicName={topicName}
        setTopicName={setTopicName}
        submittingTopic={submittingTopic}
      />

      <TopicModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleProjectSubmit}
        editingTopic={editingProject}
        topicName={projectNameInput}
        setTopicName={setProjectNameInput}
        submittingTopic={submittingProject}
      />

      <MarkingModal
        isOpen={showMarkingModal}
        onClose={() => setShowMarkingModal(false)}
        selectedTopic={selectedTopic}
        students={students}
        markingStudentId={markingStudentId}
        setMarkingStudentId={setMarkingStudentId}
        checkTopicStatus={checkTopicStatus}
        topicStatus={topicStatus}
        loadingStatus={loadingStatus}
        handleCompleteTopic={handleCompleteTopic}
        actionLoading={actionLoading}
      />

      <EditStudentModal
        isOpen={showEditStudentModal}
        onClose={() => setShowEditStudentModal(false)}
        onSubmit={handleStudentUpdateSubmit}
        editStudentName={editStudentName}
        setEditStudentName={setEditStudentName}
        editStudentWhatsapp={editStudentWhatsapp}
        setEditStudentWhatsapp={setEditStudentWhatsapp}
        editStudentCourseId={editStudentCourseId}
        setEditStudentCourseId={setEditStudentCourseId}
        editTotalClasses={editTotalClasses}
        setEditTotalClasses={setEditTotalClasses}
        editRemainingClasses={editRemainingClasses}
        setEditRemainingClasses={setEditRemainingClasses}
        courses={COURSES}
        submittingStudent={submittingStudent}
      />
    </div>
  );
}