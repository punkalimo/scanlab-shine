import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Eye, Mail, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Inquiry = Tables<"inquiries">;

export default function InquiryManager() {
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const queryClient = useQueryClient();

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["cms-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inquiry[];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inquiries").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["cms-unread-inquiries"] });
    },
  });

  const viewInquiry = (inquiry: Inquiry) => {
    setSelected(inquiry);
    if (!inquiry.is_read) markReadMutation.mutate(inquiry.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Inquiries</h2>
        <p className="text-muted-foreground text-sm">Customer messages and inquiries</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !inquiries?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No inquiries yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow key={inquiry.id} className={!inquiry.is_read ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Badge variant={inquiry.is_read ? "secondary" : "default"} className="text-xs">
                        {inquiry.is_read ? "Read" : "New"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{inquiry.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{inquiry.email}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{inquiry.subject}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {format(new Date(inquiry.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => viewInquiry(inquiry)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{selected.name} — {selected.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(selected.created_at), "MMMM dd, yyyy 'at' hh:mm a")}
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-foreground text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`mailto:${selected.email}?subject=Re: ${selected.subject}`}>
                  <Mail className="w-4 h-4" /> Reply via Email
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
