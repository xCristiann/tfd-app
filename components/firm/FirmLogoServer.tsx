interface Props {
  name: string
  logoUrl?: string
  size?: number
  radius?: number
}

export default function FirmLogoServer({ name, logoUrl, size = 44, radius = 11 }: Props) {
  const initials = name.slice(0, 2).toUpperCase()
  const fontSize = size * 0.27

  if (!logoUrl) {
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`, background: 'var(--bg2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: `${fontSize}px`, fontWeight: 800, color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace' }}>
        {initials}
      </div>
    )
  }

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}
