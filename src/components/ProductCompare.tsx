import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompareArrows, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface ProductCompareProps {
  products: Product[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

export default function ProductCompare({ products, selectedIds, onToggle, onClear }: ProductCompareProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selected = products.filter((p) => selectedIds.includes(p.id));

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
        <div className="flex -space-x-2">
          {selected.slice(0, 4).map((p) => (
            <div key={p.id} className="w-10 h-10 rounded-lg border-2 border-card bg-muted overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">{selectedIds.length} selected</span>
        <Button
          size="sm"
          className="gap-2"
          disabled={selectedIds.length < 2}
          onClick={() => setDialogOpen(true)}
        >
          <GitCompareArrows className="w-4 h-4" /> Compare
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Compare Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5" /> Product Comparison
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground w-32">Feature</th>
                  {selected.map((p) => (
                    <th key={p.id} className="p-3 text-center min-w-[180px]">
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto rounded-lg bg-muted overflow-hidden border border-border">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <p className="font-heading font-semibold text-foreground text-sm">{p.name}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-3 font-medium text-muted-foreground">Category</td>
                  {selected.map((p) => (
                    <td key={p.id} className="p-3 text-center text-foreground">{p.category}</td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-3 font-medium text-muted-foreground">Type</td>
                  {selected.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <Badge variant={p.product_type === "audio" ? "default" : "secondary"} className="text-xs">
                        {p.product_type === "audio" ? "Audio" : "Spares"}
                      </Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-3 font-medium text-muted-foreground">Price</td>
                  {selected.map((p) => (
                    <td key={p.id} className="p-3 text-center font-heading font-bold text-primary">
                      {p.price ? `K${p.price.toLocaleString()}` : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-muted-foreground align-top">Description</td>
                  {selected.map((p) => (
                    <td key={p.id} className="p-3 text-center text-muted-foreground text-xs">
                      {p.description || "No description"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
