-- Guest contact details for direct bookings (email, phone, notes).
-- Kept in its own table, not on bookings, because cleaners can read the
-- organisation's bookings rows. This table is staff-only (Owner/Manager).

create table public.booking_guest_contacts (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.booking_guest_contacts_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.organization_id := public.my_org_id();
  else
    new.organization_id := old.organization_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_booking_guest_contacts_before_write
  before insert or update on public.booking_guest_contacts
  for each row execute function public.booking_guest_contacts_before_write();

alter table public.booking_guest_contacts enable row level security;

create policy "booking_guest_contacts_staff_all"
  on public.booking_guest_contacts for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());
