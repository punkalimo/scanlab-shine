import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";

const checkoutSchema = z.object({
  fulfillment_type: z.enum(["pickup", "courier"]),
  pickup_location: z.string().optional(),
  address_id: z.string().optional(),
  delivery_zone_id: z.string().optional(),
  contact_phone: z.string().min(10, "Valid phone number required"),
  notes: z.string().optional(),
  coupon_code: z.string().optional(),
  guest_email: z.string().email().optional(),
});

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discount, setDiscount] = useState<number | null>(null);

  // Fetch cart
  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const result = await api.getCart();
      return result as any;
    },
  });

  // Fetch addresses
  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const result = await api.getAddresses();
      return result as any[];
    },
    enabled: !!user,
  });

  // Fetch delivery zones
  const { data: zones } = useQuery({
    queryKey: ["deliveryZones"],
    queryFn: async () => {
      const result = await api.getDeliveryZones();
      return result as any[];
    },
  });

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fulfillment_type: "pickup",
      contact_phone: "",
    },
  });

  const fulfillmentType = form.watch("fulfillment_type");

  const createOrderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof checkoutSchema>) => {
      await api.createOrder(data as any);
    },
    onSuccess: () => {
      toast({ title: "Order placed successfully!" });
      navigate("/orders");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applyCoupon = async (code: string) => {
    if (!code.trim()) return;
    try {
      const result = await api.validateCoupon(code, cart?.subtotal || 0);
      const data = result as any;
      if (data.valid) {
        setDiscount(data.discount_amount);
        form.setValue("coupon_code", code);
      }
    } catch (error: any) {
      toast({ title: "Invalid coupon", description: error.message, variant: "destructive" });
    }
  };

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => {
    if (!user && !data.guest_email) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    createOrderMutation.mutate(data);
  };

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const deliveryFee = fulfillmentType === "courier" 
    ? zones?.find((z: any) => z.id === form.watch("delivery_zone_id"))?.fee || 0 
    : 0;
  const total = subtotal + deliveryFee - (discount || 0);

  if (cartLoading) {
    return <Layout><div className="container py-12">Loading...</div></Layout>;
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
          <Button onClick={() => navigate("/spares")}>Browse Products</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-heading font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="+260977123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!user && (
                      <FormField
                        control={form.control}
                        name="guest_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Fulfillment Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="fulfillment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pickup" id="pickup" />
                                <Label htmlFor="pickup">Pickup (Free)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="courier" id="courier" />
                                <Label htmlFor="courier">Courier Delivery</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {fulfillmentType === "pickup" ? (
                      <FormField
                        control={form.control}
                        name="pickup_location"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Pickup Location</FormLabel>
                            <FormControl>
                              <Input placeholder="ScanLab Motor Spares, Lusaka" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name="delivery_zone_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Zone</FormLabel>
                              <FormControl>
                                <select
                                  className="w-full p-2 border rounded-md"
                                  {...field}
                                >
                                  <option value="">Select zone</option>
                                  {zones?.map((zone: any) => (
                                    <option key={zone.id} value={zone.id}>
                                      {zone.name} - K{zone.fee}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {user && addresses && addresses.length > 0 && (
                          <FormField
                            control={form.control}
                            name="address_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Or select saved address</FormLabel>
                                <FormControl>
                                  <select
                                    className="w-full p-2 border rounded-md"
                                    {...field}
                                  >
                                    <option value="">Select address</option>
                                    {addresses.map((addr: any) => (
                                      <option key={addr.id} value={addr.id}>
                                        {addr.street_address}, {addr.city}
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              className="w-full p-2 border rounded-md min-h-[100px]"
                              placeholder="Any special instructions..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? "Processing..." : `Place Order - K${total.toFixed(2)}`}
                </Button>
              </form>
            </Form>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p>K{(item.price_at_add * item.quantity).toFixed(2)}</p>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>K{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? "Free" : `K${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  {discount !== null && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-K{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>K{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={form.watch("coupon_code") || ""}
                      onChange={(e) => form.setValue("coupon_code", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => applyCoupon(form.watch("coupon_code") || "")}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
