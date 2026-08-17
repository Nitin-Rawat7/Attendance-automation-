export default function StudentsView({ students, courses, loading, searchQuery, setSearchQuery, onEditStudent }: any) {
  const getCourseName = (courseId: number) => {
    const c = courses.find((x: any) => x.id === courseId);
    return c ? c.name : "N/A";
  };

  return (
    <div className="space-y-4">
      <input 
        type="text" 
        placeholder="Search students..." 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
        className="border border-gray-300 rounded-lg p-2.5 text-sm w-full bg-white shadow-sm" 
      />
      {loading ? (
        <p className="text-sm text-gray-500">Loading students...</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">No students found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y shadow-sm">
          {students.map((s: any) => (
            <div key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50/50 transition">
              <div>
                <p className="font-bold text-sm text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  WhatsApp: <span className="font-medium text-gray-700">{s.parent_whatsapp || "N/A"}</span> | 
                  Course: <span className="font-semibold text-blue-600">{getCourseName(s.course_id)}</span> | 
                  Total Classes: <span className="font-semibold text-gray-700">{s.total_classes ?? 0}</span> | 
                  Remaining Classes: <span className="font-semibold text-emerald-600">{s.remaining_classes ?? 0}</span>
                </p>
              </div>
              <button 
                onClick={() => onEditStudent(s)} 
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3.5 py-1.5 rounded-lg font-semibold transition"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}