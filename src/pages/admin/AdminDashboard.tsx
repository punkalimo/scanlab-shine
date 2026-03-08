import { useQuery } from "@tanstack/react-query";
import { Package, Mail, MailOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { data: productCount = 0 } = useQuery({
    queryKey: ["admin", "productCount"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: inquiryStats = { total: 0, unread: 0 } } = useQuery({
    queryKey: ["admin", "inquiryStats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("inquiries").select("*", { count: "exact", head: true });
      const { count: unread } = await supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("is_read", false);
      return { total: total ?? 0, unread: unread ?? 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const stats = [
    { title: "Total Products", value: productCount, icon: Package, color: "text-primary" },
    { title: "Total Inquiries", value: inquiryStats.total, icon: Mail, color: "text-accent" },
    { title: "Unread Inquiries", value: inquiryStats.unread, icon: MailOpen, color: "text-destructive" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
