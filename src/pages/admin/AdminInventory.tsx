import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, AlertTriangle, Search, RefreshCw, ArrowUpDown, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { api } from "@/integrations/api/client";

type InventoryItem = {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  max_stock_level: number | null;
  updated_at: string;
  available_quantity?: number;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    price?: number | null;
  };
};

type AdminProduct = {
  id: string;
  name: string;
  sku?: string | null;
};

const movementTypes = [
  { value: "purchase", label: "Purchase / Restock" },
  { value: "adjustment", label: "Manual Adjustment" },
  { value: "sale", label: "Sale / Dispatch" },
  { value: "return", label: "Customer Return" },
  { value: "damage", label: "Damage / Loss" },
  { value: "transfer", label: "Transfer" },
];

function formatNumber(val?: number | null) {
  if (val === undefined || val === null || Number.isNaN(val)) return "—";
  return val.toLocaleString();
}

function statusBadge(item: InventoryItem) {
  const available = item.available_quantity ?? item.quantity - (item.reserved_quantity || 0);
  const threshold = item.reorder_level ?? 0;
  if (available <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (available <= threshold) return <Badge className="bg-yellow-500 text-white">Low Stock</Badge>;
  return <Badge className="bg-green-500 text-white">Healthy</Badge>;
}

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState("purchase");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => api.getInventory() as Promise<{ inventory: InventoryItem[] }> ,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ["admin", "inventory", "low"],
    queryFn: async () => api.getLowStockItems() as Promise<InventoryItem[]>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin", "products", "inventory"],
    queryFn: async () => api.getProducts({ sort: "name", limit: 500 }) as Promise<{ products: AdminProduct[] }>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const inventory = inventoryData?.inventory || [];
  const products = productsData?.products || [];

  const mergedInventory: InventoryItem[] = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach((item) => map.set(item.product_id, item));
    products.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, {
          id: `placeholder-${p.id}`,
          product_id: p.id,
          quantity: 0,
          reserved_quantity: 0,
          reorder_level: 0,
          max_stock_level: null,
          updated_at: "",
          product: p,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.product?.name || "").localeCompare(b.product?.name || ""));
  }, [inventory, products]);

  const stats = useMemo(() => {
    const outOfStock = mergedInventory.filter((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0).length;
    const lowStock = lowStockData?.length ?? 0;
    return {
      totalSkus: mergedInventory.length,
      lowStock,
      outOfStock,
    };
  }, [mergedInventory, lowStockData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mergedInventory;
    return mergedInventory.filter((item) => {
      const name = item.product?.name?.toLowerCase() || "";
      const sku = item.product?.sku?.toLowerCase() || "";
      return name.includes(term) || sku.includes(term);
    });
  }, [mergedInventory, search]);

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No product selected");
      const parsedQty = Number(quantity);
      if (!parsedQty || parsedQty <= 0) throw new Error("Enter a quantity greater than 0");

      const isAddition = movementType === "purchase" || movementType === "return";
      const delta = isAddition ? parsedQty : -parsedQty;
      const nextQuantity = Math.max((selected.quantity ?? 0) + delta, 0);

      await api.addStockMovement({
        product_id: selected.product_id,
        movement_type: movementType,
        quantity: delta,
        notes: notes.trim() || undefined,
      });

      if (reorderLevel !== "") {
        const parsedReorder = Number(reorderLevel);
        if (!Number.isNaN(parsedReorder) && parsedReorder >= 0) {
          await api.updateInventory(selected.product_id, { reorder_level: parsedReorder, quantity: nextQuantity });
        }
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "low"] });
      await queryClient.refetchQueries({ queryKey: ["admin", "inventory"], exact: true });
      await queryClient.refetchQueries({ queryKey: ["admin", "inventory", "low"], exact: true });
      toast({ title: "Inventory updated" });
      setDialogOpen(false);
      setQuantity("");
      setNotes("");
      setReorderLevel("");
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const openDialog = (item: InventoryItem) => {
    setSelected(item);
    setMovementType("purchase");
    setQuantity("");
    setNotes("");
    setReorderLevel(item.reorder_level?.toString() ?? "");
    setDialogOpen(true);
  };

  const openDialogForProduct = (productId: string) => {
    const existing = inventory.find((i) => i.product_id === productId);
    if (existing) {
      openDialog(existing);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    // Fallback stub when inventory record is missing
    openDialog({
      id: "temp",
      product_id: product.id,
      quantity: 0,
      reserved_quantity: 0,
      reorder_level: 0,
      max_stock_level: null,
      updated_at: new Date().toISOString(),
      product,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track on-hand, reserved, and reorder levels in real time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] })} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total SKUs</p>
            <p className="text-2xl font-heading font-bold">{stats.totalSkus}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            <p className="text-2xl font-heading font-bold text-yellow-600">{stats.lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            <p className="text-2xl font-heading font-bold text-destructive">{stats.outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      {mergedInventory.some((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0) && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="py-3">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Out of stock ({mergedInventory.filter((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {mergedInventory
              .filter((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0)
              .slice(0, 10)
              .map((item) => (
                <Badge key={item.id} variant="outline" className="bg-white text-destructive border-destructive/40">
                  {item.product?.name || "Unnamed"}
                </Badge>
              ))}
            {mergedInventory.filter((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0).length > 10 && (
              <Badge variant="outline" className="bg-white text-destructive border-destructive/40">+{mergedInventory.filter((i) => (i.available_quantity ?? i.quantity - (i.reserved_quantity || 0)) <= 0).length - 10} more</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {lowStockData && lowStockData.length > 0 && (
        <Card className="border-yellow-500/60 bg-yellow-50">
          <CardHeader className="py-3">
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Low stock ({lowStockData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {lowStockData.slice(0, 10).map((item) => (
              <Badge key={item.id} variant="outline" className="bg-white text-yellow-800 border-yellow-200">
                {item.product?.name || "Unnamed"}: {item.quantity}
              </Badge>
            ))}
            {lowStockData.length > 10 && (
              <Badge variant="outline" className="bg-white text-yellow-800 border-yellow-200">+{lowStockData.length - 10} more</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" /> Inventory
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Select onValueChange={openDialogForProduct} disabled={productsLoading || products.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={productsLoading ? "Loading products…" : "Find product…"} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU"
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No inventory records found</TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const available = item.available_quantity ?? item.quantity - (item.reserved_quantity || 0);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || "Untitled"}</TableCell>
                      <TableCell>{item.product?.sku || "—"}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.reserved_quantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(available)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.reorder_level)}</TableCell>
                      <TableCell>{statusBadge(item)}</TableCell>
                      <TableCell>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openDialog(item)}>
                          <ArrowUpDown className="h-4 w-4" /> Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust stock{selected?.product?.name ? ` — ${selected.product.name}` : ""}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                <div>
                  <p className="text-muted-foreground">On hand</p>
                  <p className="font-semibold">{formatNumber(selected.quantity)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reserved</p>
                  <p className="font-semibold">{formatNumber(selected.reserved_quantity)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <p className="font-semibold">{formatNumber(selected.available_quantity ?? selected.quantity - (selected.reserved_quantity || 0))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder level</p>
                  <p className="font-semibold">{formatNumber(selected.reorder_level)}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Movement type</p>
                    <Select value={movementType} onValueChange={setMovementType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Quantity</p>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Reorder level</p>
                    <Input
                      type="number"
                      min={0}
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      placeholder="Leave to keep current"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Notes (optional)</p>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reference PO, return, or reason"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-md p-3">
                <span className="flex items-center gap-1">
                  <MoveRight className="h-4 w-4" /> Change preview
                </span>
                <span className="font-medium">
                  {movementType === "purchase" || movementType === "return" ? "+" : "-"}
                  {quantity || "0"} units
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => addStockMutation.mutate()} disabled={addStockMutation.isPending}>
                  {addStockMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a product to adjust stock.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
