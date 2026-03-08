
-- Create brands table
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand_type text NOT NULL DEFAULT 'truck' CHECK (brand_type IN ('truck', 'audio')),
  logo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Anyone can view active brands
CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing brands
INSERT INTO public.brands (name, brand_type, sort_order) VALUES
  ('International', 'truck', 1),
  ('Freightliner', 'truck', 2),
  ('Volvo', 'truck', 3),
  ('Scania', 'truck', 4),
  ('Howo', 'truck', 5),
  ('MAN', 'truck', 6),
  ('DAF', 'truck', 7),
  ('Isuzu', 'truck', 8),
  ('Mitsubishi', 'truck', 9),
  ('Toyota', 'truck', 10),
  ('Pioneer', 'audio', 1),
  ('JBL', 'audio', 2),
  ('Kenwood', 'audio', 3),
  ('Sony', 'audio', 4),
  ('Alpine', 'audio', 5),
  ('Blaupunkt', 'audio', 6);
