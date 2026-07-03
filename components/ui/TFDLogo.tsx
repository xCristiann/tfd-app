export function TFDLogo({ size = 32 }: { size?: number }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="18" fill="url(#tfd_g)"/>
      <defs>
        <linearGradient id="tfd_g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5a0"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect x="22" y="28" width="32" height="44" rx="4" fill="rgba(4,18,12,0.85)"/>
      <rect x="28" y="28" width="32" height="44" rx="4" fill="rgba(4,18,12,0.95)" stroke="rgba(0,229,160,0.4)" strokeWidth="1.2"/>
      <rect x="34" y="38" width="18" height="2" rx="1" fill="#00e5a0" opacity="0.9"/>
      <rect x="34" y="44" width="14" height="2" rx="1" fill="#a78bfa" opacity="0.7"/>
      <rect x="34" y="50" width="16" height="2" rx="1" fill="#00e5a0" opacity="0.5"/>
      <rect x="34" y="56" width="12" height="2" rx="1" fill="#a78bfa" opacity="0.4"/>
      <circle cx="72" cy="34" r="14" fill="rgba(4,18,12,0.9)" stroke="#a78bfa" strokeWidth="1.5"/>
      <path d="M63 36 L68 30 L73 36 L78 28" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="78" cy="28" r="2.5" fill="#00e5a0"/>
    </svg>
  )
}