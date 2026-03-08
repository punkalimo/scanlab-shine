import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const productSchema = z.object({
  name: z.string().trim().min(1, "Required").max(200),
  slug: z.string().trim().min(1, "Required").max(200),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
  category_id: z.string().uuid("Invalid category id").optional().or(z.literal("")),
  product_type: z.enum(["spares", "audio"]),
  price: z.coerce.number().min(0).optional(),
  image_path: z.string().trim().max(255).optional().or(z.literal("")),
});

type ProductForm = z.infer<typeof productSchema>;

const slugify = (val: string) =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminProducts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"products"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", slug: "", sku: "", description: "", category_id: "", product_type: "spares", price: undefined, image_path: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", slug: "", sku: "", description: "", category_id: "", product_type: "spares", price: undefined, image_path: "" });
    setDialogOpen(true);
  };

  const openEdit = (product: Tables<"products">) => {
    setEditing(product);
    form.reset({
      name: product.name,
      slug: (product as any).slug || "",
      sku: (product as any).sku || "",
      description: product.description ?? "",
      category_id: (product as any).category_id || "",
      product_type: product.product_type,
      price: product.price ?? undefined,
      image_path: (product as any).image_url ?? "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: ProductForm) => {
      const slug = (values.slug || values.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const payload: any = {
        name: values.name,
        slug,
        sku: values.sku || null,
        category_id: values.category_id || null,
        product_type: values.product_type,
        description: values.description || null,
        price: values.price ?? 0,
        // Store only the path (e.g., product-images/uuid-filename.jpg)
        image_url: values.image_path || null,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editing ? "Product updated" : "Product created" });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const next = slugify(e.target.value || "");
                          form.setValue("slug", next, { shouldValidate: true });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Auto-generated from name; must be unique.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SKU123" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Helpful for inventory tracking and analytics.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="product_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="spares">Spares</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category_id" render={({ field }) => (
                  <FormItem><FormLabel>Category ID</FormLabel><FormControl><Input placeholder="UUID (optional)" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price (ZMW)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="image_path" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image (Supabase storage path)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="product-images/uuid-file.jpg" {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <Button type="button" variant="outline" size="sm" disabled={uploading}>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setUploading(true);
                                const path = `product-images/${crypto.randomUUID()}-${file.name}`;
                                const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
                                if (error) throw error;
                                field.onChange(path);
                                toast({ title: "Uploaded", description: "Path saved to product." });
                              } catch (err: any) {
                                toast({ title: "Upload failed", description: err.message || "Unable to upload image", variant: "destructive" });
                              } finally {
                                setUploading(false);
                                e.target.value = "";
                              }
                            }}
                          />
                          {uploading ? "Uploading..." : "Upload"}
                        </label>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Only the storage path is stored; derive the public URL when rendering.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const categoryLabel = (p as any).category || (p as any).category_name || p.product_type;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize">{p.product_type}</TableCell>
                    <TableCell>{categoryLabel}</TableCell>
                    <TableCell>{p.price ? `K${p.price.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products yet. Add your first product!</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
