export default function EditStudentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editStudentName, 
  setEditStudentName, 
  editStudentWhatsapp, 
  setEditStudentWhatsapp, 
  editStudentCourseId,
  setEditStudentCourseId,
  editTotalClasses,
  setEditTotalClasses,
  editRemainingClasses,
  setEditRemainingClasses,
  courses,
  submittingStudent 
}: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl w-96 space-y-4 shadow-lg">
        <h3 className="font-bold text-lg text-gray-800">Edit Student Details</h3>
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600">Student Name</label>
          <input 
            type="text" 
            value={editStudentName} 
            onChange={(e) => setEditStudentName(e.target.value)} 
            placeholder="Student Name" 
            className="border rounded-lg w-full p-2.5 text-sm" 
            required 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600">Parent WhatsApp</label>
          <input 
            type="text" 
            value={editStudentWhatsapp} 
            onChange={(e) => setEditStudentWhatsapp(e.target.value)} 
            placeholder="Parent WhatsApp" 
            className="border rounded-lg w-full p-2.5 text-sm" 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600">Course</label>
          <select 
            value={editStudentCourseId} 
            onChange={(e) => setEditStudentCourseId(Number(e.target.value))} 
            className="border rounded-lg w-full p-2.5 text-sm bg-white font-medium"
          >
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Total Classes</label>
            <input 
              type="number" 
              value={editTotalClasses} 
              onChange={(e) => setEditTotalClasses(Number(e.target.value))} 
              placeholder="Total" 
              className="border rounded-lg w-full p-2.5 text-sm" 
              min="0" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Remaining Classes</label>
            <input 
              type="number" 
              value={editRemainingClasses} 
              onChange={(e) => setEditRemainingClasses(Number(e.target.value))} 
              placeholder="Remaining" 
              className="border rounded-lg w-full p-2.5 text-sm" 
              min="0" 
              required 
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={submittingStudent} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
            {submittingStudent ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}