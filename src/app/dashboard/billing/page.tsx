import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt, formatDate } from '@/lib/utils'
import { TRADER_NAV } from '@/lib/nav'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-[rgba(0,217,126,.1)] text-[var(--green)]',
  pending:   'bg-[rgba(212,168,67,.1)] text-[var(--gold)]',
  refunded:  'bg-[rgba(255,51,82,.1)] text-[var(--red)]',
  failed:    'bg-[rgba(255,51,82,.1)] text-[var(--red)]',
}

export function BillingPage() {
  const { profile } = useAuth()
  const { toasts, dismiss } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('orders')
      .select('*, challenge_products(name, account_size, challenge_type)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [profile?.id])

  function downloadInvoice(order: any) {
    setDownloading(order.id)
    const html = generateInvoiceHTML(order, profile)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TFD-Invoice-${order.order_number}.html`
    a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setDownloading(null), 1000)
  }

  function generateInvoiceHTML(order: any, user: any) {
    const prod = order.challenge_products
    const date = new Date(order.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.order_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#1a1a1a;padding:60px;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:32px;border-bottom:2px solid #D4A843}.logo{font-size:22px;font-weight:800}.logo span{color:#D4A843}.invoice-label{font-size:28px;font-weight:700;color:#D4A843}.meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px}.meta h3{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:600;margin-bottom:10px}.meta p{font-size:13px;line-height:1.7;color:#333}table{width:100%;border-collapse:collapse;margin-bottom:32px}th{background:#f8f6f0;padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#888;font-weight:600}td{padding:14px 16px;border-bottom:1px solid #f0ede5;font-size:13px}.total td{font-weight:700;font-size:15px;border-top:2px solid #D4A843;border-bottom:none;padding-top:16px;color:#D4A843}.footer{margin-top:48px;padding-top:24px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center;line-height:1.8}
</style></head><body>
<div class="header">
  <div class="logo">The Funded <span>Diaries</span><br><small style="font-size:11px;color:#888;font-weight:400;letter-spacing:2px;text-transform:uppercase">Write Your Trading Story</small></div>
  <div style="text-align:right"><div class="invoice-label">INVOICE</div><div style="font-size:13px;color:#888;margin-top:4px">#${order.order_number}</div><div style="font-size:13px;color:#888">${date}</div></div>
</div>
<div class="meta">
  <div><h3>Billed To</h3><p><strong>${user?.first_name ?? ''} ${user?.last_name ?? ''}</strong><br>${user?.email ?? ''}<br>${user?.country ?? ''}<br>${order.billing_address ? `${order.billing_address}, ${order.billing_city} ${order.billing_postal}` : ''}</p></div>
  <div><h3>Payment Details</h3><p>Method: <strong>${order.payment_method ?? 'Card'}</strong><br>Stripe ID: <strong style="font-size:11px">${order.stripe_payment_id ?? '—'}</strong></p></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type</th><th>Account Size</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td><strong>${prod?.name ?? 'Trading Challenge'}</strong><br><span style="font-size:11px;color:#888">Prop Trading Challenge Fee — One-time</span></td><td style="font-size:11px;color:#888">${prod?.challenge_type === '1step' ? '1-Step' : prod?.challenge_type === 'instant' ? 'Instant' : '2-Step'}</td><td>$${prod?.account_size ? Number(prod.account_size).toLocaleString() : '—'}</td><td style="text-align:right;font-weight:600">$${order.amount_usd}</td></tr>
    ${order.discount_usd > 0 ? `<tr><td colspan="3" style="color:#00875A">Coupon: ${order.coupon_code}</td><td style="text-align:right;color:#00875A">-$${order.discount_usd}</td></tr>` : ''}
  </tbody>
  <tfoot><tr class="total"><td colspan="3">Total Paid</td><td style="text-align:right">$${order.final_amount_usd ?? order.amount_usd}</td></tr></tfoot>
</table>
<div class="footer">The Funded Diaries — Prop Trading<br>support@thefundeddiaries.com<br>This invoice was generated automatically.</div>
</body></html>`
  }

  const totalSpent = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (Number(o.final_amount_usd ?? o.amount_usd) ?? 0), 0)

  return (
    <>
      <DashboardLayout title="Billing & Invoices" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-3 gap-[11px]">
          <KPICard label="Total Orders"      value={String(orders.length)}                                               sub="All time"/>
          <KPICard label="Total Spent"       value={fmt(totalSpent)}                                                     sub="Challenge fees" subColor="text-[var(--gold)]"/>
          <KPICard label="Challenges Bought" value={String(orders.filter(o=>o.status==='completed').length)}             sub="Completed" subColor="text-[var(--green)]"/>
        </div>

        <Card>
          <CardHeader title="Purchase History"/>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/></div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-[28px] mb-3">🧾</div>
              <div className="text-[13px] font-semibold mb-1">No purchases yet</div>
              <p className="text-[11px] text-[var(--text3)]">Your purchase history will appear here after you buy a challenge.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Order #','Date','Product','Account Size','Amount','Discount','Status','Invoice'].map(h => (
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.02)]">
                    <td className="px-[11px] py-[10px] font-mono text-[var(--gold)] font-bold text-[10px]">{o.order_number}</td>
                    <td className="px-[11px] py-[10px] text-[var(--text3)] text-[10px]">{formatDate(o.created_at)}</td>
                    <td className="px-[11px] py-[10px]">
                      <div className="font-semibold">{o.challenge_products?.name ?? '—'}</div>
                      <div className="text-[9px] text-[var(--text3)] mt-[1px]">{o.challenge_products?.challenge_type === '1step' ? '1-Step' : o.challenge_products?.challenge_type === 'instant' ? 'Instant' : '2-Step'} Challenge</div>
                    </td>
                    <td className="px-[11px] py-[10px] font-mono text-[10px]">${o.challenge_products?.account_size ? Number(o.challenge_products.account_size).toLocaleString() : '—'}</td>
                    <td className="px-[11px] py-[10px] font-mono font-semibold">${o.final_amount_usd ?? o.amount_usd}</td>
                    <td className="px-[11px] py-[10px]">
                      {o.discount_usd > 0
                        ? <span className="text-[var(--green)] font-mono text-[10px]">-${o.discount_usd} <span className="text-[9px] text-[var(--text3)]">({o.coupon_code})</span></span>
                        : <span className="text-[var(--text3)]">—</span>}
                    </td>
                    <td className="px-[11px] py-[10px]">
                      <span className={`text-[8px] px-2 py-1 font-bold uppercase ${STATUS_COLORS[o.status] ?? 'text-[var(--text3)]'}`}>{o.status}</span>
                    </td>
                    <td className="px-[11px] py-[10px]">
                      <button onClick={() => downloadInvoice(o)} disabled={downloading === o.id}
                        className="px-[8px] py-[4px] text-[8px] uppercase font-bold cursor-pointer border border-[var(--bdr2)] text-[var(--gold)] bg-[rgba(212,168,67,.06)] hover:bg-[rgba(212,168,67,.12)] transition-colors disabled:opacity-50">
                        {downloading === o.id ? '...' : '↓ Invoice'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
