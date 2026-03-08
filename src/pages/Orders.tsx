import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Package, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { api } from "@/integrations/api/client";

const statusColors: Record<string, string> = {
  pending_payment: "bg-yellow-500",
  paid: "bg-blue-500",
  processing: "bg-purple-500",
  ready_for_pickup: "bg-orange-500",
  out_for_delivery: "bg-indigo-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
  refunded: "bg-gray-500",
};

export default function Orders() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const result = await api.getOrders();
      return result as any;
    },
  });

  const orders = ordersData?.orders || [];

  if (isLoading) {
    return <Layout><div className="container py-12">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-heading font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here.</p>
            <Link to="/spares">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <Card key={order.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={statusColors[order.status] || "bg-gray-500"}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        {order.fulfillment_type === "pickup" ? (
                          <>
                            <Package className="h-4 w-4" />
                            <span>Pickup: {order.pickup_location || "Store"}</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            <span>Delivery via {order.courier_name}</span>
                          </>
                        )}
                      </div>
                      <p className="font-semibold">K{Number(order.total).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items?.length || 0} items
                      </p>
                    </div>
                    <Link to={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View Details <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
