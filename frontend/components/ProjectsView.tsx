export default function ProjectsView({ 
  projects, 
  loading, 
  students, 
  selectedStudentId, 
  setSelectedStudentId, 
  onAddClick,
  onEditClick,
  onDeleteClick,
  onMarkCompleteClick,
  actionLoading 
}: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Course Projects & Progress</h3>
            <p className="text-xs text-gray-500 mt-0.5">Select a student and mark project completion to notify parents</p>
          </div>
          <button 
            onClick={onAddClick} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Add Project
          </button>
        </div>

        {/* Student Selection Dropdown */}
        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <span className="text-xs font-semibold text-gray-700">Active Student:</span>
          <select 
            value={selectedStudentId} 
            onChange={(e) => setSelectedStudentId(Number(e.target.value))} 
            className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white font-medium flex-1 max-w-md"
          >
            {students.length === 0 ? (
              <option value="">No students available</option>
            ) : (
              students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Projects List with Complete Buttons */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects found for this course.</p>
        ) : (
          <div className="border rounded-xl divide-y">
            {projects.map((p: any) => {
              const isLoadingThis = actionLoading === `project_complete_${p.id}`;
              return (
                <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50/50 transition">
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  <div className="space-x-2 flex items-center">
                    <button 
                      disabled={isLoadingThis || !selectedStudentId}
                      onClick={() => onMarkCompleteClick(p)} 
                      className="text-xs bg-green-50 hover:bg-green-100 text-green-600 px-3.5 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {isLoadingThis ? "Sending..." : "Mark Complete"}
                    </button>
                    <button 
                      onClick={() => onEditClick(p)} 
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => onDeleteClick(p.id)} 
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}