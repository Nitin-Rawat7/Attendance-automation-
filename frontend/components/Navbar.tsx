import { COURSES } from "@/app/page";

export default function Navbar({ activeTab, selectedCourse, setSelectedCourse }: any) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      <h1 className="text-lg font-bold text-gray-800 capitalize">{activeTab} Overview</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-500">Course:</span>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white font-medium"
        >
          {COURSES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}