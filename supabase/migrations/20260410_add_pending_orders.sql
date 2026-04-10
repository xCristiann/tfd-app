create table if not exists public.pending_orders (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  order_type text not null check (order_type in ('buy_limit', 'sell_limit', 'buy_stop', 'sell_stop')),

  lots numeric(18,4) not null check (lots > 0),
  trigger_price numeric(18,8) not null,
  stop_loss numeric(18,8),
  take_profit numeric(18,8),

  status text not null default 'pending'
    check (status in ('pending', 'triggered', 'cancelled', 'expired')),

  placed_at timestamptz not null default now(),
  triggered_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pending_orders_account_id
  on public.pending_orders(account_id);

create index if not exists idx_pending_orders_user_id
  on public.pending_orders(user_id);

create index if not exists idx_pending_orders_status
  on public.pending_orders(status);

create index if not exists idx_pending_orders_symbol_status
  on public.pending_orders(symbol, status);

create or replace function public.set_pending_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pending_orders_updated_at on public.pending_orders;

create trigger trg_pending_orders_updated_at
before update on public.pending_orders
for each row
execute function public.set_pending_orders_updated_at();

alter table public.pending_orders enable row level security;

drop policy if exists "pending_orders_select_own" on public.pending_orders;
create policy "pending_orders_select_own"
on public.pending_orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "pending_orders_insert_own" on public.pending_orders;
create policy "pending_orders_insert_own"
on public.pending_orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "pending_orders_update_own" on public.pending_orders;
create policy "pending_orders_update_own"
on public.pending_orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pending_orders_delete_own" on public.pending_orders;
create policy "pending_orders_delete_own"
on public.pending_orders
for delete
to authenticated
using (auth.uid() = user_id);
