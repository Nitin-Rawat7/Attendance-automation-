export default function MarkingModal({ isOpen, onClose, selectedTopic, students, markingStudentId, setMarkingStudentId, checkTopicStatus, topicStatus, loadingStatus, handleCompleteTopic, actionLoading }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[400px] space-y-4">
        <h3 className="font-bold text-lg">Mark Topic: {selectedTopic?.name}</h3>
        <select value={markingStudentId} onChange={(e) => { const id = Number(e.target.value); setMarkingStudentId(id); checkTopicStatus(id, selectedTopic.id); }} className="border rounded w-full p-2 text-sm">
          {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <p className="text-sm">Status: <span className="font-bold">{loadingStatus ? "Checking..." : topicStatus}</span></p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600">Close</button>
          <button onClick={handleCompleteTopic} disabled={actionLoading === "topic_complete"} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-semibold">Mark Complete</button>
        </div>
      </div>
    </div>
  );
}