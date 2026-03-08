import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import WhatsAppEnquire from "./WhatsAppEnquire";

export default function FeaturedProducts() {
  const { data: products = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  if (!products.length) return null;

  return (
    <section className="container py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-10"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold">New Arrivals</h2>
          <p className="mt-2 text-muted-foreground">Latest products added to our catalog</p>
        </div>
        <Link to="/spares" className="hidden sm:inline-flex items-center gap-1 text-primary font-medium hover:gap-2 transition-all">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem key={product.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Card className="group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="p-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-primary">{product.category}</span>
                  <h3 className="mt-1 font-heading font-semibold text-foreground line-clamp-2">{product.name}</h3>
                  {product.price && (
                    <p className="mt-1 font-heading font-bold text-primary">K{product.price.toLocaleString()}</p>
                  )}
                  <div className="mt-3">
                    <WhatsAppEnquire productName={product.name} />
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 bg-card border-border" />
        <CarouselNext className="-right-4 bg-card border-border" />
      </Carousel>
    </section>
  );
}
