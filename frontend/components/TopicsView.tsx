export default function TopicsView({ topics, loading, onAddClick, onEditClick, onDeleteClick, onMarkCompleteClick }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Course Topics</h3>
        <button onClick={onAddClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Add Topic
        </button>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading topics...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {topics.map((t: any) => (
            <div key={t.id} className="p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">{t.name}</span>
              <div className="space-x-2">
                <button onClick={() => onMarkCompleteClick(t)} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded font-semibold">Mark Complete</button>
                <button onClick={() => onEditClick(t)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded font-semibold">Edit</button>
                <button onClick={() => onDeleteClick(t.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded font-semibold">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}