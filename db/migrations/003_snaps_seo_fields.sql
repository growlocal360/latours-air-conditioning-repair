-- 003: Add GL360-generated SEO + structured fields to snaps.
-- All columns are nullable so existing rows (from before GL360 added the
-- canonical SEO scheme) continue to work. New webhook events populate them.

alter table public.snaps add column if not exists short_id              text;
alter table public.snaps add column if not exists url_path              text;
alter table public.snaps add column if not exists meta_title            text;
alter table public.snaps add column if not exists h1                    text;
alter table public.snaps add column if not exists meta_description      text;
alter table public.snaps add column if not exists alt_text              text;
alter table public.snaps add column if not exists public_location_label text;
alter table public.snaps add column if not exists primary_problem       text;
alter table public.snaps add column if not exists equipment_type        text;

-- Helpful index for any future short_id lookups.
create index if not exists snaps_short_id_idx on public.snaps (short_id);
