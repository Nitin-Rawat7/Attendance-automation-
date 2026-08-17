"use client";

import { useState, useEffect } from "react";

type MediaItem = {
  id: number;
  student_id: number;
  student_name: string;
  type: string;
  media_url: string;
  sent: boolean;
  caption: string;
};

type Student = { id: number; name: string };

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function GalleryView() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  // Filters
  const [filterStudent, setFilterStudent] = useState<string>("");

  // Upload Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<number | "">("");
  const [mediaType, setMediaType] = useState<string>("photo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = filterStudent ? `${API}/media/student/${filterStudent}` : `${API}/media/`;
      const [mediaRes, studentsRes] = await Promise.all([
        fetch(endpoint),
        fetch(`${API}/students/`)
      ]);
      const mediaData = await mediaRes.json();
      const studentsData = await studentsRes.json();

      setMediaList(Array.isArray(mediaData) ? mediaData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      if (studentsData.length > 0 && studentId === "") {
        setStudentId(studentsData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStudent]);

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !selectedFile) {
      alert("Please select a student and choose a file from your device.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("student_id", String(studentId));
      formData.append("type", mediaType);
      formData.append("file", selectedFile);
      formData.append("caption", caption);

      const res = await fetch(`${API}/media/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload media");

      setShowModal(false);
      setSelectedFile(null);
      setCaption("");
      fetchData();
      alert("Media uploaded successfully!");
    } catch (err: any) {
      alert(err.message || "Error adding media");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToWhatsApp = async (id: number) => {
    if (!confirm("Are you sure you want to send this media to the parent's WhatsApp?")) return;

    setSendingId(id);
    try {
      const res = await fetch(`${API}/media/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send media");

      alert("Media sent successfully to WhatsApp!");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error sending media");
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      const res = await fetch(`${API}/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Download Handler Function
  const handleDownload = async (mediaUrl: string) => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = mediaUrl.split("/").pop() || "student-media";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(mediaUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Gallery & Projects</h1>
          <p className="text-xs text-gray-500">Manage and send student project media via WhatsApp</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs cursor-pointer shadow-xs transition-colors"
        >
          + Add Project Media
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-semibold text-gray-700">Filter by Student:</span>
        <select
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading media items...</div>
        ) : mediaList.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            No media records found. Click "+ Add Project Media" to upload one.
          </div>
        ) : (
          mediaList.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-48 w-full bg-gray-100 relative overflow-hidden group">
                  {/* Clickable image to open full size */}
                  <a href={item.media_url} target="_blank" rel="noopener noreferrer" title="Click to view full image">
                    <img
                      src={item.media_url}
                      alt={item.caption || "Project Media"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </a>
                  <div className="absolute top-2 right-2 pointer-events-none">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shadow-xs ${item.sent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.sent ? 'Sent' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{item.student_name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono uppercase">{item.type}</span>
                  </div>
                  {item.caption && <p className="text-xs font-medium text-gray-800">{item.caption}</p>}
                </div>
              </div>
              <div className="p-4 pt-0 flex justify-between items-center border-t border-gray-50 mt-2 pt-3">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleDownload(item.media_url)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium cursor-pointer transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => handleSendToWhatsApp(item.id)}
                  disabled={sendingId === item.id}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded text-xs font-medium cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                >
                  {sendingId === item.id ? "Sending..." : item.sent ? "Resend" : "Send WhatsApp"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Media Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Upload Project Media</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Media Type</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Choose File from Device</label>
                <input
                  type="file"
                  required
                  accept="image/*,video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Caption / Title (Optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Science Project Showcase"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium cursor-pointer shadow-xs"
                >
                  {submitting ? "Uploading..." : "Upload Media"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}