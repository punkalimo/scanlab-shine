import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Upload, X, Search, Package, ImagePlus, Download, FileUp, FolderEdit } from "lucide-react";
import { Dialog as BulkDialog, DialogContent as BulkDialogContent, DialogHeader as BulkDialogHeader, DialogTitle as BulkDialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface ProductForm {
  name: string;
  description: string;
  category: string;
  product_type: "spares" | "audio";
  price: string;
  mainImage: File | null;
  galleryImages: File[];
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "",
  product_type: "spares",
  price: "",
  mainImage: null,
  galleryImages: [],
};

export default function ProductManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGallery, setExistingGallery] = useState<{ id: string; image_url: string }[]>([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["cms-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductForm) => {
      setUploading(true);
      let imageUrl = editingProduct?.image_url ?? null;

      if (formData.mainImage) {
        imageUrl = await uploadImage(formData.mainImage);
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim(),
        product_type: formData.product_type,
        price: formData.price ? parseFloat(formData.price) : null,
        image_url: imageUrl,
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Remove deleted gallery images
      if (removedGalleryIds.length > 0) {
        await supabase.from("product_images").delete().in("id", removedGalleryIds);
      }

      // Upload new gallery images
      if (formData.galleryImages.length > 0) {
        const currentMax = existingGallery.length;
        const galleryInserts = await Promise.all(
          formData.galleryImages.map(async (file, idx) => {
            const url = await uploadImage(file);
            return { product_id: productId!, image_url: url, sort_order: currentMax + idx };
          })
        );
        const { error } = await supabase.from("product_images").insert(galleryInserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-products"] });
      queryClient.invalidateQueries({ queryKey: ["cms-products-count"] });
      queryClient.invalidateQueries({ queryKey: ["cms-spares-count"] });
      queryClient.invalidateQueries({ queryKey: ["cms-audio-count"] });
      toast({ title: editingProduct ? "Product updated" : "Product created" });
      resetForm();
      setUploading(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-products"] });
      queryClient.invalidateQueries({ queryKey: ["cms-products-count"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-products"] });
      queryClient.invalidateQueries({ queryKey: ["cms-products-count"] });
      queryClient.invalidateQueries({ queryKey: ["cms-spares-count"] });
      queryClient.invalidateQueries({ queryKey: ["cms-audio-count"] });
      setSelectedIds(new Set());
      toast({ title: "Products deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setMainImagePreview(null);
    setGalleryPreviews([]);
    setExistingGallery([]);
    setRemovedGalleryIds([]);
    setDialogOpen(false);
  };

  const openEdit = async (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      product_type: product.product_type,
      price: product.price?.toString() ?? "",
      mainImage: null,
      galleryImages: [],
    });
    setMainImagePreview(product.image_url);
    setRemovedGalleryIds([]);
    setGalleryPreviews([]);

    // Load existing gallery images
    const { data } = await supabase
      .from("product_images")
      .select("id, image_url")
      .eq("product_id", product.id)
      .order("sort_order");
    setExistingGallery(data ?? []);
    setDialogOpen(true);
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, mainImage: file });
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      setForm({ ...form, galleryImages: [...form.galleryImages, ...files] });
      setGalleryPreviews([...galleryPreviews, ...files.map((f) => URL.createObjectURL(f))]);
    }
  };

  const removeNewGallery = (idx: number) => {
    setForm({ ...form, galleryImages: form.galleryImages.filter((_, i) => i !== idx) });
    setGalleryPreviews(galleryPreviews.filter((_, i) => i !== idx));
  };

  const removeExistingGallery = (id: string) => {
    setRemovedGalleryIds([...removedGalleryIds, id]);
    setExistingGallery(existingGallery.filter((img) => img.id !== id));
  };

  const filtered = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || p.product_type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const exportCsv = () => {
    const data = filtered ?? [];
    if (!data.length) return toast({ title: "Nothing to export" });
    const headers = ["Name", "Description", "Category", "Type", "Price", "Image URL", "Created At"];
    const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const rows = data.map((p) => [
      escape(p.name),
      escape(p.description ?? ""),
      escape(p.category),
      escape(p.product_type),
      p.price ?? "",
      escape(p.image_url ?? ""),
      p.created_at,
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground text-sm">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={form.product_type} onValueChange={(v: "spares" | "audio") => setForm({ ...form, product_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spares">Spare Parts</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Price (ZMW)</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>

              {/* Main Image */}
              <div className="space-y-2">
                <Label>Main Image</Label>
                {mainImagePreview && (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={mainImagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setMainImagePreview(null); setForm({ ...form, mainImage: null }); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/80 text-background flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload main image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
                </label>
              </div>

              {/* Gallery Images */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" /> Gallery Images
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {existingGallery.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingGallery(img.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {galleryPreviews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewGallery(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add gallery images</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryAdd} />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={uploading || saveMutation.isPending}>
                  {uploading ? "Uploading..." : saveMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="spares">Spare Parts</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} selected product(s)?`)) {
                bulkDeleteMutation.mutate(Array.from(selectedIds));
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedIds.size} selected
          </Button>
        )}
      </div>

      {/* Product Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No products found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id} data-state={selectedIds.has(product.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{product.category}</TableCell>
                    <TableCell>
                      <Badge variant={product.product_type === "audio" ? "default" : "secondary"} className="text-xs">
                        {product.product_type === "audio" ? "Audio" : "Spares"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {product.price ? `K${product.price.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this product?")) deleteMutation.mutate(product.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
