import { useEffect, useRef } from 'react'

export function EquityCurve({ data }: { data: number[] | { balance: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  function draw(vals: number[]) {
    const c = ref.current
    if (!c) return
    const W = c.parentElement!.clientWidth || 400
    const H = 140
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    if (vals.length < 2) {
      vals = [100000,100420,101200,100900,102100,103400,104800,106100,107400,108420]
    }

    const mn = Math.min(...vals) * 0.999
    const mx = Math.max(...vals) * 1.001
    const toY = (v: number) => H - ((v - mn) / (mx - mn)) * (H - 8)
    const step = W / (vals.length - 1)

    // Grid
    ctx.strokeStyle = 'rgba(34,85,204,.06)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 3; i++) {
      const y = (H / 3) * i
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Fill
    ctx.beginPath()
    vals.forEach((v, i) => i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * step, toY(v)))
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(34,85,204,.12)')
    g.addColorStop(1, 'rgba(34,85,204,.01)')
    ctx.fillStyle = g; ctx.fill()

    // Line
    ctx.beginPath()
    vals.forEach((v, i) => i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * step, toY(v)))
    ctx.strokeStyle = '#2255CC'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke()

    // End dot
    const lx = (vals.length - 1) * step
    const ly = toY(vals[vals.length - 1])
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#2255CC'; ctx.fill()
    ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(34,85,204,.25)'; ctx.lineWidth = 2; ctx.stroke()
  }

  useEffect(() => {
    if (!data || data.length === 0) { draw([]); return }
    const nums = typeof data[0] === 'number'
      ? data as number[]
      : (data as {balance:number}[]).map(d => d.balance)
    draw(nums)
  }, [data])

  return <canvas ref={ref} style={{ width: '100%', height: 140, display: 'block' }} />
}
