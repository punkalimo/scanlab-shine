import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ProductGalleryProps {
  productId: string;
  mainImageUrl: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductGallery({ productId, mainImageUrl, productName, open, onOpenChange }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["product-gallery", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, image_url")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const allImages = [
    ...(mainImageUrl ? [{ id: "main", image_url: mainImageUrl }] : []),
    ...galleryImages,
  ];

  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
  const next = () => setCurrentIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));

  if (!allImages.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-background/95 backdrop-blur border-border overflow-hidden">
        <div className="relative">
          {/* Main image */}
          <div className="aspect-[4/3] bg-muted flex items-center justify-center">
            <img
              src={allImages[currentIndex]?.image_url}
              alt={`${productName} - ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-foreground/70 text-background text-xs px-3 py-1 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
        </div>

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {allImages.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === currentIndex ? "border-primary" : "border-border"
                }`}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Product name */}
        <div className="px-4 pb-4">
          <p className="font-heading font-semibold text-foreground">{productName}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
