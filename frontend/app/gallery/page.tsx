"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  Send,
  Link as LinkIcon,
  CheckCircle2,
  User,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";

type StudentRow = {
  id: number;
  name: string;
  course_name: string;
};

type MediaRow = {
  id: number;
  type: string;
  url: string;
  sent: boolean;
};

export default function GalleryPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);

  const [uploading, setUploading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const [showUrlForm, setShowUrlForm] = useState(false);

  const [urlForm, setUrlForm] = useState({
    url: "",
    type: "photo",
  });

  const [search, setSearch] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const accent = "#B565F0";

  // ============================================================
  // LOAD STUDENTS
  // ============================================================

  useEffect(() => {
    fetch(`${API}/students/`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data);

        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {});
  }, [API]);

  // ============================================================
  // LOAD MEDIA
  // ============================================================

  const loadMedia = (studentId: number) => {
    fetch(`${API}/media/student/${studentId}`)
      .then((r) => r.json())
      .then(setMedia)
      .catch(() => {});
  };

  useEffect(() => {
    if (selectedId) {
      loadMedia(selectedId);
    }
  }, [selectedId]);

  // ============================================================
  // UPLOAD PHOTO / VIDEO
  // ============================================================

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !selectedId) {
      return;
    }

    setUploading(true);

    const formData = new FormData();

    formData.append(
      "student_id",
      String(selectedId)
    );

    formData.append(
      "file",
      file
    );

    try {
      const res = await fetch(
        `${API}/media/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        loadMedia(selectedId);
      } else {
        alert("Upload failed");
      }
    } catch {
      alert("Could not upload media");
    }

    setUploading(false);

    e.target.value = "";
  };

  // ============================================================
  // ADD MEDIA BY URL
  // ============================================================

  const handleUrlSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!urlForm.url || !selectedId) {
      alert("Enter a URL");
      return;
    }

    setUploading(true);

    try {
      const res = await fetch(
        `${API}/media/add-url`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            student_id: selectedId,
            url: urlForm.url,
            type: urlForm.type,
          }),
        }
      );

      if (res.ok) {
        setUrlForm({
          url: "",
          type: "photo",
        });

        setShowUrlForm(false);

        loadMedia(selectedId);
      } else {
        alert("Failed to add URL");
      }
    } catch {
      alert("Could not add media URL");
    }

    setUploading(false);
  };

  // ============================================================
  // SEND MEDIA
  // ============================================================

  const sendMedia = async (
    mediaId: number
  ) => {
    setSendingId(mediaId);

    try {
      const res = await fetch(
        `${API}/media/${mediaId}/send`,
        {
          method: "POST",
        }
      );

      if (res.ok && selectedId) {
        loadMedia(selectedId);
      } else {
        alert("Failed to send");
      }
    } catch {
      alert("Could not send media");
    }

    setSendingId(null);
  };

  // ============================================================
  // DELETE MEDIA
  // ============================================================

  const deleteMedia = async (
    mediaId: number
  ) => {
    if (!confirm("Delete this media?")) {
      return;
    }

    try {
      await fetch(
        `${API}/media/${mediaId}`,
        {
          method: "DELETE",
        }
      );

      if (selectedId) {
        loadMedia(selectedId);
      }
    } catch {
      alert("Failed to delete media");
    }
  };

  // ============================================================
  // FILTER STUDENTS
  // ============================================================

  const filteredStudents =
    students.filter((s) =>
      s.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const pendingMedia =
    media.filter((m) => !m.sent);

  const sentMedia =
    media.filter((m) => m.sent);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="flex h-screen overflow-hidden">

      <Sidebar />

      {/* STUDENT LIST */}

      <div
        className="
          w-72
          bg-[var(--panel)]
          h-full
          overflow-y-auto
          border-r
          border-[var(--border)]
          py-6
          flex-shrink-0
        "
      >

        <h3
          className="
            px-5
            text-xs
            font-display
            font-semibold
            text-[var(--ink-dim)]
            uppercase
            tracking-widest
            mb-3
          "
        >
          Students
        </h3>

        <div className="px-3 mb-3">

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search student..."
            className="
              w-full
              bg-[var(--panel-light)]
              border
              border-[var(--border)]
              rounded-lg
              px-3
              py-2
              text-xs
              text-[var(--ink)]
            "
          />

        </div>

        <div className="flex flex-col gap-1 px-3">

          {filteredStudents.map((s) => {

            const active =
              s.id === selectedId;

            return (

              <button
                key={s.id}
                onClick={() =>
                  setSelectedId(s.id)
                }
                className="
                  flex
                  items-center
                  gap-3
                  px-3
                  py-3
                  rounded-xl
                  text-left
                  transition
                "
                style={{
                  background: active
                    ? "var(--panel-light)"
                    : "transparent",

                  boxShadow: active
                    ? `0 0 14px ${accent}20`
                    : "none",
                }}
              >

                <div
                  className="
                    w-9
                    h-9
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                  style={{
                    background: active
                      ? `${accent}25`
                      : "var(--panel-light)",

                    color: active
                      ? accent
                      : "var(--ink-dim)",
                  }}
                >
                  <User size={16} />
                </div>

                <div className="min-w-0">

                  <p
                    className="
                      text-sm
                      font-semibold
                      truncate
                    "
                    style={{
                      color: active
                        ? accent
                        : "var(--ink)",
                    }}
                  >
                    {s.name}
                  </p>

                  <p
                    className="
                      text-xs
                      text-[var(--ink-dim)]
                      truncate
                    "
                  >
                    {s.course_name}
                  </p>

                </div>

              </button>

            );

          })}

        </div>

      </div>

      {/* MAIN CONTENT */}

      <main
        className="
          flex-1
          min-w-0
          h-full
          overflow-y-auto
          p-8
        "
      >

        <h2
          className="
            text-2xl
            font-display
            font-bold
            tracking-wide
            mb-1
          "
          style={{
            color: accent,
          }}
        >
          {students.find(
            (s) => s.id === selectedId
          )?.name || "Gallery"}
        </h2>

        <p
          className="
            text-[var(--ink-dim)]
            text-sm
            mb-6
          "
        >
          Upload and share moments with parents
        </p>

        {/* TOP BUTTONS */}

        <div className="flex gap-3 mb-8">

          <label
            className="
              flex
              items-center
              gap-2
              px-6
              py-4
              rounded-md
              text-sm
              font-semibold
              cursor-pointer
              transition
              hover:opacity-90
            "
            style={{
              background: accent,
              color: "#0A0E17",
            }}
          >

            <Upload size={16} />

            {uploading
              ? "UPLOADING..."
              : "UPLOAD PHOTO/VIDEO"}

            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />

          </label>

          <button
            onClick={() =>
              setShowUrlForm(!showUrlForm)
            }
            className="
              flex
              items-center
              gap-2
              px-6
              py-4
              rounded-md
              text-sm
              font-semibold
              transition
            "
            style={{
              background: "var(--panel-light)",
              border: `1px solid ${accent}50`,
              color: accent,
            }}
          >

            <LinkIcon size={16} />

            {showUrlForm
              ? "CANCEL"
              : "ADD BY URL"}

          </button>

        </div>

        {/* URL FORM */}

        {showUrlForm && (

          <form
            onSubmit={handleUrlSubmit}
            className="
              bg-[var(--panel)]
              glow-border
              rounded-2xl
              p-5
              mb-8
              flex
              gap-3
              items-end
              flex-wrap
            "
          >

            <div
              className="
                flex-1
                min-w-[240px]
              "
            >

              <label
                className="
                  text-xs
                  text-[var(--ink-dim)]
                  uppercase
                  tracking-wide
                "
              >
                Media URL
              </label>

              <input
                value={urlForm.url}
                onChange={(e) =>
                  setUrlForm({
                    ...urlForm,
                    url: e.target.value,
                  })
                }
                className="
                  w-full
                  mt-1
                  bg-[var(--panel-light)]
                  border
                  border-[var(--border)]
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  text-[var(--ink)]
                "
                placeholder="https://..."
              />

            </div>

            <div>

              <label
                className="
                  text-xs
                  text-[var(--ink-dim)]
                  uppercase
                  tracking-wide
                "
              >
                Type
              </label>

              <select
                value={urlForm.type}
                onChange={(e) =>
                  setUrlForm({
                    ...urlForm,
                    type: e.target.value,
                  })
                }
                className="
                  w-full
                  mt-1
                  bg-[var(--panel-light)]
                  border
                  border-[var(--border)]
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  text-[var(--ink)]
                "
              >

                <option value="photo">
                  Photo
                </option>

                <option value="video">
                  Video
                </option>

              </select>

            </div>

            <button
              type="submit"
              disabled={uploading}
              className="
                px-5
                py-2.5
                rounded-full
                text-sm
                font-semibold
                disabled:opacity-50
              "
              style={{
                background: accent,
                color: "#0A0E17",
              }}
            >
              {uploading
                ? "ADDING..."
                : "ADD"}
            </button>

          </form>

        )}

        {/* MEDIA SECTION */}

        {pendingMedia.length === 0 &&
        sentMedia.length === 0 ? (

          <p
            className="
              text-[var(--ink-dim)]
              text-sm
              text-center
              py-16
            "
          >
            No media yet — upload the first one.
          </p>

        ) : (

          <>

            {/* READY TO SEND */}

            {pendingMedia.length > 0 && (

              <div className="mb-8">

                <h3
                  className="
                    text-xs
                    font-display
                    font-semibold
                    text-[var(--ink-dim)]
                    uppercase
                    tracking-widest
                    mb-3
                  "
                >
                  Ready to Send
                </h3>

                <div className="flex flex-col gap-3">

                  {pendingMedia.map((m) => (

                    <div
                      key={m.id}
                      className="
                        flex
                        items-center
                        gap-4
                        bg-[var(--panel)]
                        glow-border
                        rounded-2xl
                        p-3
                        min-h-24
                        max-h-24
                        overflow-hidden
                      "
                    >

                      {/* FIXED SMALL PREVIEW */}

                      <div
                        className="
                          w-16
                          h-16
                          min-w-16
                          max-w-16
                          min-h-16
                          max-h-16
                          rounded-lg
                          overflow-hidden
                          bg-[var(--panel-light)]
                          flex-shrink-0
                          flex
                          items-center
                          justify-center
                        "
                      >

                        {m.type === "photo" ? (

                          <img
                            src={m.url}
                            alt="Student media"
                            className="block object-cover"
                            style={{ width: "64px", height: "64px", minWidth: "64px", minHeight: "64px" }}
                          />

                        ) : (

                          <video
                            src={m.url}
                            controls
                            className="
                              block
                              w-full
                              h-full
                              object-cover
                            "
                          />

                        )}

                      </div>

                      {/* MEDIA DETAILS */}

                      <div
                        className="
                          flex-1
                          min-w-0
                          overflow-hidden
                        "
                      >

                        <p
                          className="
                            text-sm
                            text-[var(--ink)]
                            capitalize
                            truncate
                          "
                        >
                          {m.type}
                        </p>

                        <p
                          className="
                            text-xs
                            text-[var(--ink-dim)]
                            truncate
                          "
                        >
                          Ready to send to parent
                        </p>

                      </div>

                      {/* SEND */}

                      <button
                        onClick={() =>
                          sendMedia(m.id)
                        }
                        disabled={
                          sendingId === m.id
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          px-5
                          py-2.5
                          rounded-md
                          text-sm
                          font-semibold
                          flex-shrink-0
                          disabled:opacity-50
                        "
                        style={{
                          background: accent,
                          color: "#0A0E17",
                        }}
                      >

                        <Send size={14} />

                        {sendingId === m.id
                          ? "SENDING..."
                          : "SEND"}

                      </button>

                      {/* DELETE */}

                      <button
                        onClick={() =>
                          deleteMedia(m.id)
                        }
                        className="
                          text-xs
                          text-[var(--ink-dim)]
                          hover:text-[#FB7185]
                          px-2
                          flex-shrink-0
                        "
                      >
                        DELETE
                      </button>

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* ALREADY SENT */}

            {sentMedia.length > 0 && (

              <div>

                <h3
                  className="
                    text-xs
                    font-display
                    font-semibold
                    text-[var(--ink-dim)]
                    uppercase
                    tracking-widest
                    mb-3
                  "
                >
                  Already Sent
                </h3>

                <div className="flex flex-col gap-3">

                  {sentMedia.map((m) => (

                    <div
                      key={m.id}
                      className="
                        flex
                        items-center
                        gap-4
                        bg-[var(--panel)]
                        rounded-2xl
                        p-3
                        min-h-24
                        max-h-24
                        overflow-hidden
                        opacity-60
                      "
                    >

                      {/* SMALL PREVIEW */}

                      <div
                        className="
                          w-16
                          h-16
                          min-w-16
                          max-w-16
                          min-h-16
                          max-h-16
                          rounded-lg
                          overflow-hidden
                          bg-[var(--panel-light)]
                          flex-shrink-0
                          flex
                          items-center
                          justify-center
                        "
                      >

                        {m.type === "photo" ? (

                          <img
                            src={m.url}
                            alt="Sent media"
                            className="block object-cover"
                            style={{ width: "64px", height: "64px", minWidth: "64px", minHeight: "64px" }}
                          />

                        ) : (

                          <video
                            src={m.url}
                            controls
                            className="
                              block
                              w-full
                              h-full
                              object-cover
                            "
                          />

                        )}

                      </div>

                      <p
                        className="
                          text-sm
                          text-[var(--ink-dim)]
                          flex-1
                          capitalize
                          truncate
                        "
                      >
                        {m.type}
                      </p>

                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          px-5
                          py-2.5
                          rounded-md
                          text-sm
                          font-semibold
                          flex-shrink-0
                        "
                        style={{
                          color: "#4ADE9C",
                        }}
                      >

                        <CheckCircle2 size={14} />

                        SENT

                      </div>

                      <button
                        onClick={() =>
                          deleteMedia(m.id)
                        }
                        className="
                          text-xs
                          text-[var(--ink-dim)]
                          hover:text-[#FB7185]
                          px-2
                          flex-shrink-0
                        "
                      >
                        DELETE
                      </button>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </>

        )}

      </main>

    </div>
  );
}