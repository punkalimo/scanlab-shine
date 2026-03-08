
-- Site settings table (key-value store for website configuration)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site settings"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Content pages table (editable page content)
CREATE TABLE public.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content pages"
  ON public.content_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can update content pages"
  ON public.content_pages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert content pages"
  ON public.content_pages FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete content pages"
  ON public.content_pages FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('business_name', 'ScanLab Motor Spares'),
  ('phone', '+260977760291'),
  ('whatsapp', '+260977760291'),
  ('email', 'info@scanlab.com'),
  ('address', '1563 Kalambo Road, Light Industrial Area, Lusaka, Zambia'),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('working_hours', 'Mon-Fri: 8:00 AM - 5:00 PM, Sat: 8:00 AM - 1:00 PM');

-- Seed default content pages
INSERT INTO public.content_pages (page_key, title, content) VALUES
  ('homepage_hero', 'Homepage Hero', '{"tagline": "New Generation of Genuine Products", "heading": "Your Trusted Partner for Motor Spares in Zambia", "subtext": "Quality truck & trailer spares and premium car audio accessories — all under one roof at ScanLab Motor Spares.", "announcement": ""}'),
  ('about', 'About Page', '{"story_title": "Our Story", "story_p1": "ScanLab Motor Spares is a proudly Zambian-owned company specializing in truck and trailer spare parts as well as premium car audio and accessories. Located on Kalambo Road in Lusaka''s Light Industrial Area, we serve the transport industry with genuine, high-quality products sourced from trusted manufacturers worldwide.", "story_p2": "Our mission is to provide our customers with reliable, competitively priced motor spares and audio solutions, backed by expert advice and exceptional service. We believe in building long-term relationships based on trust, quality, and value."}');
