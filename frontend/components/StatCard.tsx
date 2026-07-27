import { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accent: string;
};

export default function StatCard({ icon: Icon, value, label, accent }: Props) {
  return (
      <div
        className="rounded-[30px] p-3 bg-[var(--panel)] flex-1 min-w-[20px] flex flex-col items-center justify-center text-center gap-2 border"
        style={{
          border: `1px solid ${accent}100`,
          boxShadow: `
            inset 0 0 20px ${accent}90,
            inset 0 0 45px ${accent}70,
            inset 0 0 90px ${accent}45
          `,
        }}
      >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${accent}10` }}
      >
        <Icon size={30} color={accent} strokeWidth={1} />
      </div>
      <p className="text-3xl font-display font-bold text-[var(--ink)] leading-none">{value}</p>
      <p className="text-xs font-semibold text-[var(--ink-dim)] tracking-wide uppercase">{label}</p>
    </div>
  );
}