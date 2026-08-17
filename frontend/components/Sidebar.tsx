export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: any) => void }) {
  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "topics", label: "📚 Topics" },
    { id: "projects", label: "🚀 Projects" },
    { id: "students", label: "👥 Students Directory" },
    { id: "gallery", label: "🖼️ Gallery" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-black text-blue-600 tracking-tight">RoboticSir</h2>
        <p className="text-xs text-gray-400 mt-0.5">Attendance Panel</p>
        <nav className="mt-8 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
        WhatsApp API Connected
      </div>
    </aside>
  );
}