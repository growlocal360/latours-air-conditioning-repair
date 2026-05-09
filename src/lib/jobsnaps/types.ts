export type SnapMediaItem = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  role: string | null;
};

export type SnapLocation = {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type SnapPayload = {
  id: string;
  title: string | null;
  description: string | null;
  service_type: string | null;
  brand: string | null;
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
  title: string | null;
  slug: string;
  description: string | null;
  service_type: string | null;
  brand: string | null;
  location: SnapLocation | null;
  media: SnapMediaItem[] | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string;
};
