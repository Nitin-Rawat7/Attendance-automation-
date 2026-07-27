"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import LoadingSpinner from "@/components/LoadingSpinner";

type StudentRow = {
  id: number;
  name: string;
  course_name: string;
};

type TopicRow = {
  topic_id: number;
  name: string;
  status: string;
};

type CourseRow = {
  id: number;
  name: string;
};

export default function TopicsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [topics, setTopics] =
    useState<TopicRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [actionId, setActionId] =
    useState<number | null>(null);

  const [classCompleting, setClassCompleting] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [form, setForm] = useState({
    course_id: "",
    name: "",
  });

  const [search, setSearch] =
    useState("");

  const API =
    process.env.NEXT_PUBLIC_API_URL;

  const accent = "#FBBF6B";


  // ============================================================
  // LOAD STUDENTS AND COURSES
  // ============================================================

  useEffect(() => {
    fetch(`${API}/students/`)
      .then((response) => response.json())
      .then((data) => {
        setStudents(data);

        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load students:",
          error
        );
      });


    fetch(`${API}/courses/`)
      .then((response) => response.json())
      .then(setCourses)
      .catch((error) => {
        console.error(
          "Failed to load courses:",
          error
        );
      });

  }, [API]);


  // ============================================================
  // LOAD TOPICS
  // ============================================================

  const loadTopics = (
    studentId: number
  ) => {
    setLoading(true);

    fetch(
      `${API}/students/${studentId}/topics`
    )
      .then((response) => response.json())
      .then((data) => {
        setTopics(data);
      })
      .catch((error) => {
        console.error(
          "Failed to load topics:",
          error
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };


  // ============================================================
  // LOAD TOPICS WHEN STUDENT CHANGES
  // ============================================================

  useEffect(() => {
    if (selectedId) {
      loadTopics(selectedId);
    }
  }, [selectedId]);


  // ============================================================
  // MARK TOPIC COMPLETE
  // ============================================================

  const completeTopic = async (
    topicId: number
  ) => {
    if (!selectedId) {
      return;
    }

    setActionId(topicId);

    try {
      const response = await fetch(
        `${API}/students/${selectedId}/topics/${topicId}/complete`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        console.error(
          "Failed to complete topic"
        );

        return;
      }

      setTopics((previousTopics) =>
        previousTopics.map((topic) =>
          topic.topic_id === topicId
            ? {
                ...topic,
                status: "completed",
              }
            : topic
        )
      );

    } catch (error) {

      console.error(
        "Topic completion error:",
        error
      );

    } finally {

      setActionId(null);

    }
  };


  // ============================================================
  // CLASS COMPLETE
  // ============================================================

  const completeClass = async () => {
    if (!selectedId) {
      return;
    }

    setClassCompleting(true);

    try {

      const response = await fetch(
        `${API}/students/${selectedId}/class-complete`,
        {
          method: "POST",
        }
      );


      if (!response.ok) {

        console.error(
          "Failed to complete class"
        );

        return;
      }

      console.log(
        "Class completed successfully"
      );

    } catch (error) {

      console.error(
        "Class completion error:",
        error
      );

    } finally {

      setClassCompleting(false);

    }
  };


  // ============================================================
  // ADD TOPIC
  // ============================================================

  const handleAddTopic = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !form.course_id ||
      !form.name
    ) {
      console.error(
        "Course and topic name are required"
      );

      return;
    }

    setSubmitting(true);

    try {

      const response = await fetch(
        `${API}/students/course/${form.course_id}/add-topic`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            course_id:
              Number(form.course_id),

            name: form.name,
          }),
        }
      );


      if (!response.ok) {

        console.error(
          "Failed to add topic"
        );

        return;
      }


      setForm({
        course_id: "",
        name: "",
      });

      setShowForm(false);


      if (selectedId) {
        loadTopics(selectedId);
      }

    } catch (error) {

      console.error(
        "Add topic error:",
        error
      );

    } finally {

      setSubmitting(false);

    }
  };


  // ============================================================
  // SEARCH
  // ============================================================

  const filteredTopics =
    topics.filter((topic) =>
      topic.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="flex">

      <Sidebar />


      <main className="flex-1 p-8">


        {/* HEADER */}

        <div className="flex items-center justify-between mb-6">

          <h2
            className="text-2xl font-display font-bold tracking-wide"
            style={{
              color: accent,
            }}
          >
            TOPICS MODULE
          </h2>


          <button
            onClick={() =>
              setShowForm(!showForm)
            }
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{
              background:
                "var(--panel-light)",

              border:
                `1px solid ${accent}50`,

              color: accent,
            }}
          >

            {showForm
              ? "CANCEL"
              : "+ ADD TOPIC"}

          </button>

        </div>


        {/* ADD TOPIC FORM */}

        {showForm && (

          <form
            onSubmit={handleAddTopic}
            className="bg-[var(--panel)] glow-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4"
          >

            <div>

              <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">

                Course

              </label>


              <select
                value={form.course_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    course_id:
                      event.target.value,
                  })
                }
                className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
              >

                <option value="">
                  Select course
                </option>


                {courses.map((course) => (

                  <option
                    key={course.id}
                    value={course.id}
                  >

                    {course.name}

                  </option>

                ))}

              </select>

            </div>


            <div>

              <label className="text-xs text-[var(--ink-dim)] uppercase tracking-wide">

                Topic Name

              </label>


              <input
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value,
                  })
                }
                className="w-full mt-1 bg-[var(--panel-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--ink)]"
                placeholder="e.g. Arduino Basics"
              />

            </div>


            <div className="col-span-2">

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                style={{
                  background: accent,
                  color: "#0A0E17",
                }}
              >

                {submitting
                  ? "ADDING..."
                  : "SAVE TOPIC"}

              </button>

            </div>

          </form>

        )}


        {/* STUDENT SELECTOR */}

        <div className="mb-6">

          <select
            value={selectedId ?? ""}
            onChange={(event) =>
              setSelectedId(
                Number(event.target.value)
              )
            }
            className="bg-[var(--panel)] text-[var(--ink)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm"
          >

            {students.map((student) => (

              <option
                key={student.id}
                value={student.id}
              >

                {student.name}
                {" — "}
                {student.course_name}

              </option>

            ))}

          </select>

        </div>


        {/* CLASS COMPLETE BUTTON */}

        <div className="mb-6">

          <button
            onClick={completeClass}
            disabled={
              !selectedId ||
              classCompleting
            }
            className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{
              background: "#39FF88",
              color: "#0A0E17",
            }}
          >

            {classCompleting
              ? "COMPLETING CLASS..."
              : "CLASS COMPLETE"}

          </button>

        </div>


        {/* SEARCH */}

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search topics..."
          accent={accent}
        />


        {/* TOPICS TABLE */}

        <div className="bg-[var(--panel)] glow-border rounded-xl p-5">

          {loading ? (

            <LoadingSpinner />

          ) : filteredTopics.length === 0 ? (

            <p className="text-[var(--ink-dim)] text-sm text-center py-8">

              No topics found.

            </p>

          ) : (

            <table className="w-full text-sm border-collapse">


              <thead>

                <tr className="text-left text-[var(--ink-dim)] border-b-2 border-[var(--border)] uppercase text-xs tracking-wider">

                  <th className="py-2 font-semibold">
                    Topic
                  </th>

                  <th className="font-semibold">
                    Status
                  </th>

                  <th className="font-semibold">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredTopics.map((topic) => (

                  <tr
                    key={topic.topic_id}
                    className="border-b-2"
                    style={{
                      borderBottomColor:
                        "rgba(251, 191, 107, 0.35)",
                    }}
                  >


                    <td className="py-4 font-semibold text-[var(--ink)]">

                      {topic.name}

                    </td>


                    <td>

                      <span
                        className="text-lg font-semibold px-2 py-1 rounded-lg"
                        style={{
                          color:
                            topic.status ===
                            "completed"

                              ? "#39FF88"

                              : "#7C8AA5",

                          background:
                            topic.status ===
                            "completed"

                              ? "#39FF8815"

                              : "transparent",
                        }}
                      >

                        {topic.status.toUpperCase()}

                      </span>

                    </td>


                    <td className="py-3">

                      <button
                        disabled={
                          topic.status ===
                            "completed" ||
                          actionId ===
                            topic.topic_id
                        }
                        onClick={() =>
                          completeTopic(
                            topic.topic_id
                          )
                        }
                        className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-40"
                        style={{
                          background:
                            "var(--panel-light)",

                          border:
                            `1px solid ${accent}50`,

                          color: accent,
                        }}
                      >

                        {actionId ===
                        topic.topic_id

                          ? "SAVING..."

                          : topic.status ===
                            "completed"

                          ? "DONE"

                          : "MARK COMPLETE"}

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