import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { ADMIN_NAV } from '@/lib/nav'

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome',
    icon: '👋',
    desc: 'Sent on registration',
    color: 'text-[#2255CC]',
    fields: [],
    auto: true,
  },
  {
    id: 'order_confirmation',
    label: 'Order Confirmation',
    icon: '🧾',
    desc: 'Sent after purchase',
    color: 'text-[#16A34A]',
    fields: ['order_number','product_name','account_size','account_number','login','password','server','amount','phase'],
    auto: true,
  },
  {
    id: 'kyc_approved',
    label: 'KYC Approved',
    icon: '✅',
    desc: 'Sent when KYC approved',
    color: 'text-[#16A34A]',
    fields: [],
    auto: true,
  },
  {
    id: 'kyc_declined',
    label: 'KYC Declined',
    icon: '❌',
    desc: 'Sent when KYC declined',
    color: 'text-[#DC2626]',
    fields: ['reason'],
    auto: true,
  },
  {
    id: 'payout_approved',
    label: 'Payout Approved',
    icon: '💰',
    desc: 'Sent when payout approved',
    color: 'text-[#2255CC]',
    fields: ['amount','method','account_number'],
    auto: true,
  },
  {
    id: 'payout_paid',
    label: 'Payout Paid',
    icon: '✅',
    desc: 'Sent when payout sent',
    color: 'text-[#16A34A]',
    fields: ['amount','method','tx_hash','tx_reference'],
    auto: true,
  },
  {
    id: 'payout_rejected',
    label: 'Payout Rejected',
    icon: '🚫',
    desc: 'Sent when payout rejected',
    color: 'text-[#DC2626]',
    fields: ['amount','reason'],
    auto: true,
  },
  {
    id: 'account_breached',
    label: 'Account Breached',
    icon: '🚨',
    desc: 'Sent on breach',
    color: 'text-[#DC2626]',
    fields: ['account_number','reason','balance'],
    auto: true,
  },
  {
    id: 'phase_advanced',
    label: 'Phase Advanced',
    icon: '🎯',
    desc: 'Sent when phase advances',
    color: 'text-[#2255CC]',
    fields: ['account_number','from_phase','to_phase','login','server'],
    auto: true,
  },
  {
    id: 'ticket_reply',
    label: 'Ticket Reply',
    icon: '💬',
    desc: 'Sent on support reply',
    color: 'text-[#5C7A9E]',
    fields: ['ticket_number','subject','reply_body','agent_name'],
    auto: true,
  },
  {
    id: 'custom',
    label: 'Custom Email',
    icon: '✉️',
    desc: 'Write a custom message',
    color: 'text-[#5C7A9E]',
    fields: ['subject','body'],
    auto: false,
  },
]

const FIELD_LABELS: Record<string, string> = {
  reason: 'Reason / Message',
  amount: 'Amount (e.g. $500)',
  method: 'Payment Method (e.g. USDT TRC20)',
  account_number: 'Account Number',
  tx_hash: 'Transaction Hash',
  tx_reference: 'Transaction Reference',
  order_number: 'Order Number',
  product_name: 'Product Name',
  account_size: 'Account Size (e.g. 10,000)',
  login: 'Login ID',
  password: 'Password',
  server: 'Server (e.g. CFT-Live-01)',
  phase: 'Phase (e.g. Phase 1)',
  from_phase: 'From Phase',
  to_phase: 'To Phase',
  ticket_number: 'Ticket Number',
  subject: 'Email Subject',
  reply_body: 'Message Body',
  agent_name: 'Agent Name',
  body: 'Email Body (HTML allowed)',
}

export function AdminEmailPage() {
  const { toasts, toast, dismiss } = useToast()
  const [traders, setTraders] = useState<any[]>([])
  const [loadingTraders, setLoadingTraders] = useState(true)
  const [selectedTrader, setSelectedTrader] = useState<any>(null)
  const [traderSearch, setTraderSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [recipientMode, setRecipientMode] = useState<'single' | 'all' | 'custom'>('single')
  const [customEmail, setCustomEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentLog, setSentLog] = useState<any[]>([])

  useEffect(() => {
    supabase.from('users').select('id, first_name, last_name, email, role')
      .eq('role', 'trader').order('first_name')
      .then(({ data }) => { setTraders(data ?? []); setLoadingTraders(false) })
  }, [])

  function selectTemplate(t: any) {
    setSelectedTemplate(t)
    setFieldValues({})
  }

  async function sendManual() {
    if (!selectedTemplate) { toast('error','❌','Select','Choose an email template first.'); return }

    let recipients: { email: string; first_name: string }[] = []

    if (recipientMode === 'single') {
      if (!selectedTrader) { toast('error','❌','Select','Choose a trader.'); return }
      recipients = [{ email: selectedTrader.email, first_name: selectedTrader.first_name }]
    } else if (recipientMode === 'all') {
      if (!confirm(`Send to ALL ${traders.length} traders? This cannot be undone.`)) return
      recipients = traders.map(t => ({ email: t.email, first_name: t.first_name }))
    } else {
      if (!customEmail.trim()) { toast('error','❌','Required','Enter an email address.'); return }
      recipients = [{ email: customEmail.trim(), first_name: 'Trader' }]
    }

    setSending(true)

    let successCount = 0
    let failCount = 0
    let lastError = ''

    for (const recipient of recipients) {
      const data: Record<string, any> = { first_name: recipient.first_name }
      selectedTemplate.fields.forEach((f: string) => { data[f] = fieldValues[f] ?? '' })

      const result = await sendEmail(selectedTemplate.id, recipient.email, data)
      if (result.ok) successCount++
      else { failCount++; lastError = result.error ?? 'Unknown error' }

      // Small delay to avoid rate limits when sending bulk
      if (recipients.length > 1) await new Promise(r => setTimeout(r, 200))
    }

    setSending(false)

    const logEntry = {
      id: Date.now(),
      template: selectedTemplate.label,
      recipients: recipients.length,
      success: successCount,
      fail: failCount,
      time: new Date().toLocaleTimeString(),
    }
    setSentLog(prev => [logEntry, ...prev.slice(0, 19)])

    if (failCount === 0) {
      toast('success', '📧', 'Sent!', `${successCount} email${successCount > 1 ? 's' : ''} delivered.`)
    } else if (successCount === 0) {
      toast('error', '❌', 'Failed', lastError || 'Edge Function error — check Supabase logs.')
    } else {
      toast('warning', '⚠️', 'Partial', `${successCount} sent, ${failCount} failed: ${lastError}`)
    }
  }

  const filteredTraders = traders.filter(t =>
    !traderSearch ||
    `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(traderSearch.toLowerCase())
  )

  return (
    <>
      <DashboardLayout title="Email Center" nav={ADMIN_NAV} accentColor="red">

        <div className="grid grid-cols-3 gap-[11px]">
          <KPICard label="Total Templates" value={String(EMAIL_TEMPLATES.length - 1)} sub="Automated + manual" />
          <KPICard label="Sent This Session" value={String(sentLog.reduce((s,l) => s + l.success, 0))} sub="Emails delivered" subColor="text-[#16A34A]"/>
          <KPICard label="Total Traders" value={String(traders.length)} sub="In database" subColor="text-[#2255CC]"/>
        </div>

        <div className="grid grid-cols-[340px_1fr] gap-[14px]">

          {/* Left: Template picker */}
          <div className="flex flex-col gap-[14px]">
            <Card>
              <CardHeader title="Email Templates"/>
              <div className="flex flex-col gap-[4px]">
                {EMAIL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => selectTemplate(t)}
                    className={`flex items-center gap-3 px-3 py-[9px] text-left cursor-pointer border transition-all ${
                      selectedTemplate?.id === t.id
                        ? 'border-[#C5D5EA] bg-[rgba(34,85,204,.07)]'
                        : 'border-transparent hover:border-[#F0F4FB] hover:bg-[#F4F7FD]'
                    }`}>
                    <span className="text-[16px] flex-shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-semibold ${selectedTemplate?.id === t.id ? 'text-[#2255CC]' : ''}`}>{t.label}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{t.desc}</div>
                    </div>
                    {t.auto && (
                      <span className="text-[7px] px-[5px] py-[2px] bg-[rgba(0,217,126,.08)] text-[#16A34A] border border-[rgba(0,217,126,.15)] font-bold uppercase tracking-[1px] flex-shrink-0">Auto</span>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Sent log */}
            {sentLog.length > 0 && (
              <Card>
                <CardHeader title="Send Log"/>
                <div className="flex flex-col gap-2">
                  {sentLog.slice(0, 8).map(l => (
                    <div key={l.id} className="flex items-center justify-between py-[6px] border-b border-[#F0F4FB] last:border-0 text-[10px]">
                      <div>
                        <div className="font-semibold">{l.template}</div>
                        <div className="text-[9px] text-[#8FA3BF]">{l.time} · {l.recipients} recipient{l.recipients>1?'s':''}</div>
                      </div>
                      <span className={` font-bold ${l.fail > 0 ? 'text-[#2255CC]' : 'text-[#16A34A]'}`}>
                        {l.success}/{l.recipients}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right: Compose */}
          <Card>
            {!selectedTemplate ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-[32px] mb-3">✉️</div>
                <div className="text-[13px] font-semibold mb-1">Select a Template</div>
                <p className="text-[11px] text-[#8FA3BF]">Choose an email template from the left to compose and send.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E8EEF8]">
                  <span className="text-[24px]">{selectedTemplate.icon}</span>
                  <div>
                    <div className="font-sans text-[16px] font-bold">{selectedTemplate.label}</div>
                    <div className="text-[10px] text-[#8FA3BF]">{selectedTemplate.desc}</div>
                  </div>
                  {selectedTemplate.auto && (
                    <div className="ml-auto text-[10px] text-[#16A34A] bg-[rgba(0,217,126,.08)] border border-[rgba(0,217,126,.15)] px-3 py-1">
                      ✓ Sends automatically on trigger
                    </div>
                  )}
                </div>

                {/* Recipient */}
                <div className="mb-5">
                  <label className="text-[7px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold block mb-2">Recipient</label>
                  <div className="flex gap-[3px] mb-3">
                    {[
                      { key: 'single', label: 'Single Trader' },
                      { key: 'all',    label: `All Traders (${traders.length})` },
                      { key: 'custom', label: 'Custom Email' },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setRecipientMode(key as any)}
                        className={`px-3 py-[6px] text-[9px] uppercase font-bold tracking-[1px] cursor-pointer border transition-all ${
                          recipientMode === key
                            ? 'bg-[rgba(220,38,38,.1)] border-[rgba(255,51,82,.3)] text-[#DC2626]'
                            : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF]'
                        }`}>{label}</button>
                    ))}
                  </div>

                  {recipientMode === 'single' && (
                    <div>
                      <input
                        value={traderSearch}
                        onChange={e => setTraderSearch(e.target.value)}
                        placeholder="Search trader by name or email…"
                        className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors mb-2"
                      />
                      {traderSearch && (
                        <div className="max-h-[180px] overflow-y-auto border border-[#E8EEF8] bg-[#F4F7FD]">
                          {filteredTraders.length === 0 ? (
                            <div className="px-3 py-4 text-[10px] text-[#8FA3BF] text-center">No traders found</div>
                          ) : filteredTraders.slice(0, 10).map(t => (
                            <button key={t.id} onClick={() => { setSelectedTrader(t); setTraderSearch(`${t.first_name} ${t.last_name} — ${t.email}`) }}
                              className={`w-full flex items-center gap-3 px-3 py-[8px] text-left border-b border-[#F0F4FB] last:border-0 cursor-pointer hover:bg-[rgba(34,85,204,.05)] transition-colors ${selectedTrader?.id === t.id ? 'bg-[rgba(34,85,204,.05)]' : ''}`}>
                              <div className="w-7 h-7 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] flex items-center justify-center text-[10px] font-bold text-[#2255CC] flex-shrink-0">
                                {t.first_name?.[0]}{t.last_name?.[0]}
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold">{t.first_name} {t.last_name}</div>
                                <div className="text-[9px] text-[#8FA3BF]">{t.email}</div>
                              </div>
                              {selectedTrader?.id === t.id && <span className="ml-auto text-[#2255CC] text-[12px]">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedTrader && !traderSearch.includes('—') && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(34,85,204,.05)] border border-[rgba(34,85,204,.2)]">
                          <span className="text-[#2255CC] text-[11px] font-semibold">{selectedTrader.first_name} {selectedTrader.last_name}</span>
                          <span className="text-[#8FA3BF] text-[10px]">— {selectedTrader.email}</span>
                          <button onClick={() => { setSelectedTrader(null); setTraderSearch('') }} className="ml-auto text-[#8FA3BF] hover:text-[#DC2626] cursor-pointer bg-transparent border-none text-[13px]">✕</button>
                        </div>
                      )}
                    </div>
                  )}

                  {recipientMode === 'all' && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(220,38,38,.06)] border border-[rgba(255,51,82,.2)]">
                      <span className="text-[16px]">⚠️</span>
                      <div className="text-[11px] text-[#DC2626]">
                        This will send to <strong>all {traders.length} traders</strong>. Use with caution.
                      </div>
                    </div>
                  )}

                  {recipientMode === 'custom' && (
                    <input
                      type="email"
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors"
                    />
                  )}
                </div>

                {/* Dynamic fields */}
                {selectedTemplate.fields.length > 0 && (
                  <div className="mb-5">
                    <div className="text-[7px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-3">
                      Email Data {recipientMode === 'single' && selectedTrader && <span className="text-[#16A34A] ml-2">— first_name filled automatically</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTemplate.fields.map((f: string) => (
                        <div key={f} className={f === 'body' || f === 'reply_body' ? 'col-span-2' : ''}>
                          <label className="text-[8px] uppercase tracking-[1px] text-[#8FA3BF] font-semibold block mb-1">{FIELD_LABELS[f] ?? f}</label>
                          {f === 'body' || f === 'reply_body' ? (
                            <textarea
                              value={fieldValues[f] ?? ''}
                              onChange={e => setFieldValues(v => ({ ...v, [f]: e.target.value }))}
                              placeholder={f === 'body' ? 'Write your custom email body here. HTML is supported.' : 'Write the support reply here…'}
                              rows={5}
                              className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors resize-y "
                            />
                          ) : (
                            <input
                              value={fieldValues[f] ?? ''}
                              onChange={e => setFieldValues(v => ({ ...v, [f]: e.target.value }))}
                              placeholder={FIELD_LABELS[f] ?? f}
                              className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview note */}
                <div className="p-3 bg-[#F4F7FD] border border-[#F0F4FB] mb-5 text-[10px] text-[#8FA3BF]">
                  <span className="text-[#2255CC] font-semibold">Email preview: </span>
                  Recipient will receive a branded TFD email with your data filled in.
                  {recipientMode === 'single' && selectedTrader && ` Sending to ${selectedTrader.email}.`}
                  {recipientMode === 'all' && ` Sending to all ${traders.length} traders.`}
                  {recipientMode === 'custom' && customEmail && ` Sending to ${customEmail}.`}
                </div>

                <Button
                  onClick={sendManual}
                  loading={sending}
                  className="w-full py-[13px]"
                >
                  {sending
                    ? `Sending${recipientMode === 'all' ? ` to ${traders.length} traders` : ''}…`
                    : `📧 Send ${selectedTemplate.label}${recipientMode === 'all' ? ` to All Traders` : ''}`
                  }
                </Button>
              </>
            )}
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
