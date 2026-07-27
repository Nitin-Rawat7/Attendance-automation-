export default function RobotMascot({ size = 140 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <line x1="100" y1="20" x2="100" y2="45" stroke="url(#neon)" strokeWidth="2" />
      <circle cx="100" cy="16" r="6" fill="#00E5FF" />
      <rect x="50" y="45" width="100" height="80" rx="14" fill="#10151F" stroke="url(#neon)" strokeWidth="2" />
      <rect x="65" y="65" width="30" height="14" rx="4" fill="#00E5FF" opacity="0.9" />
      <rect x="105" y="65" width="30" height="14" rx="4" fill="#A855F7" opacity="0.9" />
      <line x1="70" y1="105" x2="130" y2="105" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="60" width="12" height="40" rx="6" fill="#161C2B" stroke="url(#neon)" strokeWidth="1.5" />
      <rect x="168" y="60" width="12" height="40" rx="6" fill="#161C2B" stroke="url(#neon)" strokeWidth="1.5" />
      <rect x="70" y="125" width="25" height="35" rx="6" fill="#161C2B" stroke="url(#neon)" strokeWidth="1.5" />
      <rect x="105" y="125" width="25" height="35" rx="6" fill="#161C2B" stroke="url(#neon)" strokeWidth="1.5" />
    </svg>
  );
}