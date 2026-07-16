'use client'
import { useState } from 'react'

interface FirmLogoProps {
  name: string
  logoUrl?: string
  domain?: string
  size?: number
  radius?: number
}

export default function FirmLogo({ name, logoUrl, domain, size = 44, radius = 11 }: FirmLogoProps) {
  const initials = name.slice(0, 2).toUpperCase()
  const fontSize = Math.round(size * 0.28)
  const sources = [
    logoUrl,
    domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
    domain ? `https://logo.clearbit.com/${domain}` : null,
  ].filter(Boolean) as string[]

  const [srcIndex, setSrcIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const handleError = () => {
    if (srcIndex < sources.length - 1) setSrcIndex(i => i + 1)
    else setFailed(true)
  }

  if (failed || sources.length === 0) {
    return (
      <div style={{ width:`${size}px`,height:`${size}px`,borderRadius:`${radius}px`,background:'linear-gradient(135deg,rgba(0,229,160,0.15),rgba(124,58,237,0.15))',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:`${fontSize}px`,fontWeight:800,color:'var(--teal)',fontFamily:'JetBrains Mono, monospace' }}>
        {initials}
      </div>
    )
  }

  return (
    <div style={{ width:`${size}px`,height:`${size}px`,borderRadius:`${radius}px`,overflow:'hidden',flexShrink:0,background:'transparent' }}>
      <img src={sources[srcIndex]} alt={name} width={size} height={size}
        style={{ width:'100%',height:'100%',objectFit:'contain',display:'block' }}
        onError={handleError} />
    </div>
  )
}