export type Exhibition = {
  id: string;
  source_id: string | null;
  title: string;
  venue: string | null;
  venue_group: string | null;
  region: string | null;
  start_date: string | null;
  end_date: string | null;
  installation_date: string | null;
  dismantling_date: string | null;
  industry: string | null;
  organizer: string | null;
  homepage_url: string | null;
  source: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};
