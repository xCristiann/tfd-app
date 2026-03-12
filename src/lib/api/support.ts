import { supabase } from '@/lib/supabase'
import type { SupportTicket, TicketMessage, TicketDept, TicketPriority } from '@/types/database'

export const supportApi = {
  async createTicket(params: {
    subject: string; department: TicketDept; priority?: TicketPriority
    account_id?: string; body: string
  }): Promise<SupportTicket> {
    const { body, ...rest } = params
    const { data: ticket, error: te } = await supabase
      .from('support_tickets').insert({ ...rest, status: 'open' }).select().single()
    if (te) throw te
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: user!.id, body })
    return ticket
  },

  async getMine(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets').select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*, users(first_name,last_name,role)')
      .eq('ticket_id', ticketId).eq('is_internal', false)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async reply(ticketId: string, body: string, is_internal = false): Promise<TicketMessage> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('ticket_messages')
      .insert({ ticket_id: ticketId, sender_id: user!.id, body, is_internal }).select().single()
    if (error) throw error
    return data
  },

  async assign(ticketId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('support_tickets').update({
      assigned_to: user!.id, assigned_at: new Date().toISOString(),
    }).eq('id', ticketId).select().single()
    if (error) throw error
    return data
  },

  async resolve(ticketId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('support_tickets').update({
      status: 'resolved', resolved_by: user!.id, resolved_at: new Date().toISOString(),
    }).eq('id', ticketId).select().single()
    if (error) throw error
    return data
  },

  async adminGetAll({ status = 'open', priority }: { status?: string; priority?: string } = {}) {
    let q = supabase.from('support_tickets')
      .select('*, users(first_name,last_name,email)')
      .order('created_at', { ascending: false })
    if (status)   q = q.eq('status', status)
    if (priority) q = q.eq('priority', priority)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  subscribeToTicket(ticketId: string, cb: (msg: TicketMessage) => void) {
    return supabase.channel(`ticket-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (p) => cb(p.new as TicketMessage))
      .subscribe()
  },
}
