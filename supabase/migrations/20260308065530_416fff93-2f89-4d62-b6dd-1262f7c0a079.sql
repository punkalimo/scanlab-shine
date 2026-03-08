
-- Create product_images table for multi-image gallery
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (true);

-- Admins can insert product images
CREATE POLICY "Admins can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update product images
CREATE POLICY "Admins can update product images"
  ON public.product_images FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
  ON public.product_images FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
