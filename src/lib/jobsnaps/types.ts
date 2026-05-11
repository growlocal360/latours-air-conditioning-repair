export type MediaRole =
  | 'primary'
  | 'before'
  | 'after'
  | 'process'
  | 'detail';

export type SnapMediaItem = {
  url: string;
  // GL360-computed SEO-safe filename, e.g. 'cleveland-dryer-repair-1.jpg'.
  // When present, used as the storage key suffix. Null on legacy snaps.
  filename: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  role: MediaRole | null;
};

export type SnapLocation = {
  address: string | null;
  city: string | null;
  state: string | null;
  // 2-char abbreviation, e.g. 'LA', 'OH'. Used by JSON-LD addressRegion.
  state_abbr: string | null;
  zip: string | null;
  neighborhood: string | null;
  street_name_public: string | null;
};

export type SnapPayload = {
  // ── Identity ──
  id: string;
  short_id: string | null;

  // ── GL360-generated SEO fields (use verbatim when present) ──
  slug: string | null;
  url_path: string | null;
  meta_title: string | null;
  h1: string | null;
  meta_description: string | null;
  alt_text: string | null;
  image_filename: string | null;
  public_location_label: string | null;

  // ── Structured fields (indexing + advanced overrides) ──
  title: string | null;
  description: string | null;
  service_type: string | null;
  brand: string | null;
  primary_problem: string | null;
  equipment_type: string | null;

  location: SnapLocation;
  media: SnapMediaItem[];

  published_at: string;
  created_at: string;
};

export type WebhookEventType =
  | 'job_snap.published'
  | 'job_snap.updated'
  | 'job_snap.unpublished';

export type WebhookEvent = {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: SnapPayload;
};

export type SnapRow = {
  id: string;
  short_id: string | null;
  title: string | null;
  slug: string;
  url_path: string | null;
  description: string | null;
  meta_title: string | null;
  h1: string | null;
  meta_description: string | null;
  alt_text: string | null;
  public_location_label: string | null;
  service_type: string | null;
  brand: string | null;
  primary_problem: string | null;
  equipment_type: string | null;
  location: SnapLocation | null;
  media: SnapMediaItem[] | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string;
};
