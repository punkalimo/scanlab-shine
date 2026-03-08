import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, GripVertical, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Brand {
  id: string;
  name: string;
  brand_type: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function BrandsManager() {
  const [addOpen, setAddOpen] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", brand_type: "truck" });
  const [uploading, setUploading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["cms-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("brand_type")
        .order("sort_order");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const truckBrands = brands.filter((b) => b.brand_type === "truck");
  const audioBrands = brands.filter((b) => b.brand_type === "audio");

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = brands
        .filter((b) => b.brand_type === newBrand.brand_type)
        .reduce((max, b) => Math.max(max, b.sort_order), 0);
      const { error } = await supabase.from("brands").insert({
        name: newBrand.name,
        brand_type: newBrand.brand_type,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-brands"] });
      toast({ title: "Brand added" });
      setNewBrand({ name: "", brand_type: "truck" });
      setAddOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("brands").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms-brands"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-brands"] });
      toast({ title: "Brand deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleLogoUpload = async (brandId: string, file: File) => {
    setUploading(brandId);
    try {
      const ext = file.name.split(".").pop();
      const path = `brands/${brandId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("brands")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", brandId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["cms-brands"] });
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const renderBrandList = (list: Brand[], type: string) => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {type === "truck" ? "🚛 Truck & Trailer Brands" : "🔊 Audio Brands"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No brands added yet</p>
        )}
        {list.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            
            {/* Logo */}
            <div className="w-10 h-10 rounded-md border bg-background flex items-center justify-center overflow-hidden shrink-0">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No img</span>
              )}
            </div>

            {/* Name */}
            <span className="font-medium text-sm flex-1">{brand.name}</span>

            {/* Upload logo */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(brand.id, file);
                }}
              />
              <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Upload className="w-3 h-3" />
                {uploading === brand.id ? "Uploading..." : "Logo"}
              </div>
            </label>

            {/* Active toggle */}
            <Switch
              checked={brand.is_active}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: brand.id, is_active: checked })
              }
            />

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete "${brand.name}"?`)) deleteMutation.mutate(brand.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Brands Manager</h2>
          <p className="text-muted-foreground text-sm">Manage the brands displayed on your homepage</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input
                  value={newBrand.name}
                  onChange={(e) => setNewBrand((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Mercedes-Benz"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newBrand.brand_type}
                  onValueChange={(v) => setNewBrand((p) => ({ ...p, brand_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">Truck & Trailer</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newBrand.name.trim() || addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? "Adding..." : "Add Brand"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderBrandList(truckBrands, "truck")}
        {renderBrandList(audioBrands, "audio")}
      </div>
    </div>
  );
}
