export function TFDLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tfd_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5a0"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#tfd_bg)"/>
      <rect x="22" y="26" width="30" height="42" rx="4" fill="rgba(4,18,12,0.9)"/>
      <rect x="27" y="26" width="30" height="42" rx="4" fill="rgba(4,18,12,0.95)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      <rect x="32" y="35" width="17" height="1.8" rx="0.9" fill="#00e5a0" opacity="0.95"/>
      <rect x="32" y="41" width="13" height="1.8" rx="0.9" fill="#a78bfa" opacity="0.8"/>
      <rect x="32" y="47" width="15" height="1.8" rx="0.9" fill="#00e5a0" opacity="0.6"/>
      <rect x="32" y="53" width="11" height="1.8" rx="0.9" fill="#a78bfa" opacity="0.5"/>
      <circle cx="68" cy="34" r="13" fill="rgba(4,18,12,0.92)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2"/>
      <path d="M61 36 L66 29 L71 36 L76 27" stroke="#00e5a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="76" cy="27" r="2.5" fill="#00e5a0"/>
    </svg>
  )
}