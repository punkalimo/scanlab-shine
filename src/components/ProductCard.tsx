import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imagePath = (product as any)?.image_url || (product as any)?.images?.[0]?.image_url || null;
  const imageSrc = imagePath
    ? imagePath.startsWith("http")
      ? imagePath
      : supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl
    : null;

  const categoryLabel = (product as any).category || (product as any).category_name || product.product_type;

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground/40" />
        )}
      </div>
      <CardContent className="p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          {categoryLabel}
        </span>
        <h3 className="mt-1 font-heading font-semibold text-foreground line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
        {product.price && (
          <p className="mt-2 font-heading font-bold text-primary">
            K{product.price.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
