-- Add image_url column to store storage path for product images
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
