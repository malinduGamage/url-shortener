-- Migration: Add parsed analytics columns
-- These are populated by the Cloudflare Redirect Worker at log time.
-- Existing rows will have NULL (only new clicks will have values).

ALTER TABLE public.analytics
  ADD COLUMN IF NOT EXISTS device_type    TEXT,   -- 'mobile' | 'desktop' | 'tablet'
  ADD COLUMN IF NOT EXISTS browser        TEXT,   -- 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Opera' | 'IE' | 'Other'
  ADD COLUMN IF NOT EXISTS os             TEXT,   -- 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other'
  ADD COLUMN IF NOT EXISTS referer_domain TEXT;   -- e.g. 'twitter.com', 'google.com', NULL = direct

-- Composite index for efficient per-link time-series queries
CREATE INDEX IF NOT EXISTS idx_analytics_url_date
  ON public.analytics (url_id, created_at DESC);

-- Index for country breakdown charts
CREATE INDEX IF NOT EXISTS idx_analytics_country
  ON public.analytics (visitor_country);

-- Index for device/browser/os filter queries
CREATE INDEX IF NOT EXISTS idx_analytics_device
  ON public.analytics (device_type);
