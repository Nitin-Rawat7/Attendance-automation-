type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  accent?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  accent = "#A78BFA",
}: Props) {
  return (
    <div className="relative mb-6">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          h-11
          rounded-xl
          bg-[var(--panel)]
          border
          border-[var(--border)]
          px-4
          text-sm
          leading-none
          font-body
          text-[var(--ink)]
          placeholder:text-[var(--ink-dim)]
          placeholder:opacity-70
          focus:outline-none
          focus:border-violet-500
          transition-all
        "
        style={{
          boxShadow: value ? `0 0 0 1px ${accent}40` : "none",
        }}
      />
    </div>
  );
}