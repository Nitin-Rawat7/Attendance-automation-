export default function TopicModal({ isOpen, onClose, onSubmit, editingTopic, topicName, setTopicName, submittingTopic }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl w-96 space-y-4">
        <h3 className="font-bold text-lg">{editingTopic ? "Edit Topic" : "Add Topic"}</h3>
        <input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic Name" className="border rounded w-full p-2 text-sm" required />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
          <button type="submit" disabled={submittingTopic} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-semibold">{submittingTopic ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}