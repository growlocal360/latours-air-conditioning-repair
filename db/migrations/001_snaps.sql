-- Snaps table: stores Job Snaps published from GrowLocal 360 via webhook.
-- Run once against the Supabase Postgres for this project.

create table if not exists public.snaps (
  id            text primary key,
  title         text,
  slug          text not null unique,
  description   text,
  service_type  text,
  brand         text,
  location      jsonb,
  media         jsonb,
  published_at  timestamptz,
  created_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists snaps_published_at_idx
  on public.snaps (published_at desc);

create index if not exists snaps_slug_idx
  on public.snaps (slug);

-- Auto-touch updated_at on every UPDATE.
create or replace function public.snaps_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists snaps_touch_updated_at on public.snaps;
create trigger snaps_touch_updated_at
  before update on public.snaps
  for each row execute function public.snaps_touch_updated_at();

-- RLS: anon can read, only service_role writes.
alter table public.snaps enable row level security;

drop policy if exists "snaps_anon_read" on public.snaps;
create policy "snaps_anon_read"
  on public.snaps for select
  to anon
  using (true);

-- (No insert/update/delete policies for anon — service_role bypasses RLS.)
