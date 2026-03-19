import { useEffect, useRef } from 'react'

export function PnLBars({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const vals = data.length >= 2 ? data : [-200,400,-100,600,300,-150,800,200,500,700]
    const ctx = c.getContext('2d')!
    const W = c.parentElement!.clientWidth || 400
    const H = 100
    c.width = W; c.height = H
    const barW = (W / vals.length) * 0.6
    const gap = W / vals.length
    const maxV = Math.max(...vals.map(Math.abs), 1)
    const midY = H / 2

    vals.forEach((v, i) => {
      const x = i * gap + (gap - barW) / 2
      const h = (Math.abs(v) / maxV) * (H / 2 - 4)
      ctx.fillStyle = v >= 0 ? 'rgba(22,163,74,.7)' : 'rgba(220,38,38,.7)'
      if (v >= 0) ctx.fillRect(x, midY - h, barW, h)
      else ctx.fillRect(x, midY, barW, h)
    })

    ctx.strokeStyle = 'rgba(26,58,107,.1)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke()
  }, [data])

  return <canvas ref={ref} style={{ width: '100%', height: 100, display: 'block' }} />
}
