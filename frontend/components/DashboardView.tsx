export default function DashboardView({ students, selectedStudentId, setSelectedStudentId, actionLoading, triggerNotification }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Attendance & Notification Panel</h3>
        <div className="flex gap-4 items-center">
          <select 
            value={selectedStudentId} 
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="border border-gray-300 rounded-lg p-2.5 text-sm w-72 bg-white"
          >
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            disabled={actionLoading === "arrived"}
            onClick={() => triggerNotification("attendance-present", "arrived", "Student arrival notification sent!")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            {actionLoading === "arrived" ? "Sending..." : "🟢 Student Arrived"}
          </button>
          <button
            disabled={actionLoading === "left"}
            onClick={() => triggerNotification("left", "left", "Student departure notification sent!")}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            {actionLoading === "left" ? "🔴 Student Left" : "🔴 Student Left"}
          </button>
        </div>
      </div>
    </div>
  );
}