import { useEffect, useRef } from 'react'

export function PnLBars({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const W = c.parentElement!.clientWidth - 36
    const H = 140
    c.width = W; c.height = H

    const vals = data.length ? data : [420,-180,800,320,-230,1116,240,-80,612,440]
    const bw = Math.max(4, Math.floor((W - 4) / vals.length) - 2)
    const maxA = Math.max(...vals.map(Math.abs))
    const cy = H / 2

    vals.forEach((v, i) => {
      const x = i * (bw + 2)
      const bh = (Math.abs(v) / maxA) * (H / 2 - 4)
      ctx.fillStyle = v >= 0 ? 'rgba(0,217,126,.7)' : 'rgba(255,51,82,.7)'
      ctx.fillRect(x, v >= 0 ? cy - bh : cy, bw, bh)
    })

    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke()
  }, [data])

  return <canvas ref={ref} style={{ width: '100%', height: 140 }} />
}
