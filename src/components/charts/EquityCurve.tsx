import { useEffect, useRef } from 'react'

interface Point { balance: number }

export function EquityCurve({ data }: { data: Point[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c || data.length < 2) return
    const ctx = c.getContext('2d')!
    const W = c.parentElement!.clientWidth
    const H = 160
    c.width = W; c.height = H

    const vals = data.map((d) => d.balance)
    const mn = Math.min(...vals) * 0.999
    const mx = Math.max(...vals) * 1.001
    const toY = (v: number) => H - ((v - mn) / (mx - mn)) * H
    const step = W / (vals.length - 1)

    // Grid lines
    ctx.strokeStyle = 'rgba(212,168,67,.05)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      const y = (H / 4) * i
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Fill
    ctx.beginPath()
    vals.forEach((v, i) => { i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * step, toY(v)) })
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(0,217,126,.2)'); g.addColorStop(1, 'rgba(0,217,126,0)')
    ctx.fillStyle = g; ctx.fill()

    // Line
    ctx.beginPath()
    vals.forEach((v, i) => { i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * step, toY(v)) })
    ctx.strokeStyle = 'rgba(0,217,126,.8)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
  }, [data])

  // Fallback mock data for preview
  useEffect(() => {
    if (data.length > 0) return
    const mock = [100000,100420,101200,100900,102100,103400,104800,106100,107400,108420]
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const W = c.parentElement!.clientWidth || 400; const H = 160
    c.width = W; c.height = H
    const mn = Math.min(...mock)*0.999, mx = Math.max(...mock)*1.001
    const toY = (v: number) => H - ((v-mn)/(mx-mn))*H
    const step = W/(mock.length-1)
    ctx.beginPath()
    mock.forEach((v,i)=>{i===0?ctx.moveTo(0,toY(v)):ctx.lineTo(i*step,toY(v))})
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath()
    const g=ctx.createLinearGradient(0,0,0,H)
    g.addColorStop(0,'rgba(0,217,126,.2)');g.addColorStop(1,'rgba(0,217,126,0)')
    ctx.fillStyle=g;ctx.fill()
    ctx.beginPath()
    mock.forEach((v,i)=>{i===0?ctx.moveTo(0,toY(v)):ctx.lineTo(i*step,toY(v))})
    ctx.strokeStyle='rgba(0,217,126,.8)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke()
  }, [data])

  return <canvas ref={ref} style={{ width: '100%', height: 160 }} />
}
