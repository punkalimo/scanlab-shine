import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquare, Speaker, Wrench } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardOverview() {
  const { data: products } = useQuery({
    queryKey: ["cms-products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: spares } = useQuery({
    queryKey: ["cms-spares-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("product_type", "spares");
      return count ?? 0;
    },
  });

  const { data: audio } = useQuery({
    queryKey: ["cms-audio-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("product_type", "audio");
      return count ?? 0;
    },
  });

  const { data: inquiries } = useQuery({
    queryKey: ["cms-inquiries-count"],
    queryFn: async () => {
      const { count } = await supabase.from("inquiries").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: unreadInquiries } = useQuery({
    queryKey: ["cms-unread-inquiries"],
    queryFn: async () => {
      const { count } = await supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("is_read", false);
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Total Products", value: products ?? 0, icon: Package, color: "text-primary" },
    { label: "Spare Parts", value: spares ?? 0, icon: Wrench, color: "text-accent" },
    { label: "Audio Products", value: audio ?? 0, icon: Speaker, color: "text-primary" },
    { label: "Unread Inquiries", value: unreadInquiries ?? 0, icon: MessageSquare, color: "text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground mt-1">Here's an overview of your store.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
