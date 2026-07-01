'use client'
import { useState } from 'react'

interface FirmLogoProps {
  name: string
  logoUrl?: string
  size?: number
  radius?: number
}

export default function FirmLogo({ name, logoUrl, size = 44, radius = 11 }: FirmLogoProps) {
  const [imgError, setImgError] = useState(false)

  const initials = name.slice(0, 2).toUpperCase()
  const fontSize = size * 0.27

  // Daca nu are logo sau imaginea a dat eroare, afisam initiale
  if (!logoUrl || imgError) {
    return (
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`,
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: `${fontSize}px`, fontWeight: 800,
        color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace'
      }}>
        {initials}
      </div>
    )
  }

  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`,
      background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden'
    }}>
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setImgError(true)}
      />
    </div>
  )
}
