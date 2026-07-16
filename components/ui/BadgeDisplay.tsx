interface BadgeProps {
  badges?: string[]
  size?: 'sm' | 'md'
}

const BADGE_CONFIG: Record<string, { bg: string; icon: string }> = {
  'TFD Pro Trader': { bg: 'linear-gradient(135deg,#00e5a0,#7c3aed)', icon: '✦' },
  'Elite Trader':   { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', icon: '💎' },
  'Top Reviewer':   { bg: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', icon: '⭐' },
}

export default function BadgeDisplay({ badges, size = 'md' }: BadgeProps) {
  if (!badges?.length) return null
  const pad = size === 'sm' ? '2px 8px' : '4px 12px'
  const fs  = size === 'sm' ? '10px' : '12px'
  return (
    <div style={{ display:'flex',gap:'6px',flexWrap:'wrap' }}>
      {badges.map(b => {
        const cfg = BADGE_CONFIG[b] || BADGE_CONFIG['TFD Pro Trader']
        return (
          <span key={b} style={{ display:'inline-flex',alignItems:'center',gap:'4px',padding:pad,borderRadius:'100px',background:cfg.bg,color:'#fff',fontSize:fs,fontWeight:700,boxShadow:'0 0 10px rgba(0,229,160,0.3)' }}>
            {cfg.icon} {b}
          </span>
        )
      })}
    </div>
  )
}