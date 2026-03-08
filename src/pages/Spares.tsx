import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, Package, GitCompareArrows } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Layout from "@/components/Layout";
import ProductGallery from "@/components/ProductGallery";
import ProductCompare from "@/components/ProductCompare";
import WhatsAppEnquire from "@/components/WhatsAppEnquire";
import NoResultsInquiry from "@/components/NoResultsInquiry";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["All", "International", "Freightliner", "Volvo", "Scania", "Howo", "Trailer", "Filters", "Batteries"];

export default function Spares() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState("All");
  const [galleryProduct, setGalleryProduct] = useState<{ id: string; name: string; image_url: string | null } | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "spares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_type", "spares")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || p.category === category;
    return matchSearch && matchCat;
  });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <Layout>
      <section className="bg-nav text-nav-foreground py-16">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Truck & Trailer Spares</h1>
          <p className="mt-2 text-muted-foreground">Browse our wide range of genuine truck and trailer spare parts.</p>
        </div>
      </section>

      <section className="container py-10">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search spares..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? "default" : "outline"} size="sm" onClick={() => setCategory(cat)}>
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <NoResultsInquiry search={search} productType="truck & trailer spares" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <Card
                key={product.id}
                className="group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer relative"
                onClick={() => setGalleryProduct({ id: product.id, name: product.name, image_url: product.image_url })}
              >
                {/* Compare checkbox */}
                <div
                  className="absolute top-3 right-3 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="flex items-center gap-1.5 bg-card/90 backdrop-blur rounded-md px-2 py-1 border border-border cursor-pointer">
                    <Checkbox
                      checked={compareIds.includes(product.id)}
                      onCheckedChange={() => toggleCompare(product.id)}
                    />
                    <GitCompareArrows className="w-3 h-3 text-muted-foreground" />
                  </label>
                </div>

                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="p-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-primary">{product.category}</span>
                  <h3 className="mt-1 font-heading font-semibold text-foreground line-clamp-2">{product.name}</h3>
                  {product.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    {product.price && <p className="font-heading font-bold text-primary">K{product.price.toLocaleString()}</p>}
                    <WhatsAppEnquire productName={product.name} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {galleryProduct && (
        <ProductGallery
          productId={galleryProduct.id}
          mainImageUrl={galleryProduct.image_url}
          productName={galleryProduct.name}
          open={!!galleryProduct}
          onOpenChange={(open) => !open && setGalleryProduct(null)}
        />
      )}

      <ProductCompare
        products={products}
        selectedIds={compareIds}
        onToggle={toggleCompare}
        onClear={() => setCompareIds([])}
      />
    </Layout>
  );
}
