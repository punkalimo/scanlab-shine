import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquare, Speaker, Wrench, TrendingUp, Calendar, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AnalyticsDashboard() {
  const { data: products } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("product_type, category, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: inquiries } = useQuery({
    queryKey: ["analytics-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("created_at, is_read");
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const totalProducts = products?.length ?? 0;
  const sparesCount = products?.filter((p) => p.product_type === "spares").length ?? 0;
  const audioCount = products?.filter((p) => p.product_type === "audio").length ?? 0;
  const totalInquiries = inquiries?.length ?? 0;
  const unreadInquiries = inquiries?.filter((i) => !i.is_read).length ?? 0;

  // Product type distribution for pie chart
  const pieData = [
    { name: "Spare Parts", value: sparesCount },
    { name: "Audio", value: audioCount },
  ].filter((d) => d.value > 0);

  // Category breakdown
  const categoryMap = new Map<string, number>();
  products?.forEach((p) => {
    categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + 1);
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Inquiries over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const label = format(date, "EEE");
    const count = inquiries?.filter((inq) => {
      const d = startOfDay(new Date(inq.created_at));
      return d.getTime() === date.getTime();
    }).length ?? 0;
    return { name: label, inquiries: count };
  });

  const stats = [
    { label: "Total Products", value: totalProducts, icon: Package, color: "text-primary" },
    { label: "Spare Parts", value: sparesCount, icon: Wrench, color: "text-accent" },
    { label: "Audio Products", value: audioCount, icon: Speaker, color: "text-primary" },
    { label: "Total Inquiries", value: totalInquiries, icon: MessageSquare, color: "text-muted-foreground" },
    { label: "Unread Inquiries", value: unreadInquiries, icon: Eye, color: "text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground mt-1">Here's an overview of your store.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Inquiries Trend */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Inquiries (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalInquiries === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No inquiry data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={last7Days}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="inquiries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Product Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Product Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalProducts === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No products yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {categoryData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
