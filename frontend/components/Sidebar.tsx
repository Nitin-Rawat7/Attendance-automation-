"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, CalendarCheck, BookOpen, FolderCheck, Images, Settings, LogOut } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: BookOpen, label: "Topics", href: "/topics" },
  { icon: FolderCheck, label: "Projects", href: "/projects" },
  { icon: Images, label: "Gallery", href: "/gallery" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{ width: "200px", position: "sticky", top: 0 }} className="bg-[var(--panel)] h-screen flex flex-col border-r border-[var(--border)] px-3 py-5 flex-shrink-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-8">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #B565F0, #A855F7)", color: "#fff" }}
        >
          
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-[19px] text-[var(--ink)] leading-tight tracking-wide whitespace-nowrap">
            ROBOTIC<span style={{ color: "#A855F7" }}>SIR</span>
          </h1>
          <p className="text-[14px] text-[var(--ink-dim)] tracking-widest" style={{ color: "#A855F7" }}>CONTROL PANEL</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-[15px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative block">
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "linear-gradient(90deg, #A855F7, #7C3AED)", boxShadow: "0 0 14px rgba(168,85,247,0.35)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div
                className="relative flex items-center gap-[7] px-4 py-3 text-[18px] font-semibold"
                style={{ color: isActive ? "#fff" : "#7C8AA5" }}
              >
                <item.icon size={16} />
          {item.label}
        </div>
      </Link>
    );
  })}
</nav>
</aside>
);
}