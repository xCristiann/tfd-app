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
  const fontSize = Math.round(size * 0.28)

  if (!logoUrl || imgError) {
    return (
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`,
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: `${fontSize}px`, fontWeight: 800,
        color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace',
      }}>
        {initials}
      </div>
    )
  }

  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`,
      overflow: 'hidden', flexShrink: 0, background: 'transparent',
    }}>
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        onError={() => setImgError(true)}
      />
    </div>
  )
}