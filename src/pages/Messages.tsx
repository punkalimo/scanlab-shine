import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/integrations/api/client";

export default function Messages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const convQuery = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: async () => api.getMyConversations() as any,
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      if (!activeId) return { messages: [] } as any;
      return api.getConversationMessages(activeId) as any;
    },
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId && convQuery.data?.conversations?.length) {
      setActiveId(convQuery.data.conversations[0].id);
    }
  }, [activeId, convQuery.data]);

  const createConversation = useMutation({
    mutationFn: async () => api.createConversation() as any,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (data?.conversation?.id) setActiveId(data.conversation.id);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!activeId) throw new Error("No conversation selected");
      const ciphertext = draft.trim();
      if (!ciphertext) throw new Error("Message is empty");
      return api.sendConversationMessage(activeId, { ciphertext }) as any;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const activeMessages = messagesQuery.data?.messages || [];
  const conversations = convQuery.data?.conversations || [];

  const conversationStatus = useMemo(() => {
    if (!conversations.length) return "No conversations yet";
    const active = conversations.find((c: any) => c.id === activeId);
    if (!active) return "Select a conversation";
    return active.assignee_role ? `Assigned to ${active.assignee_role.replace(/_/g, " ")}` : "Unassigned";
  }, [conversations, activeId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeMessages, activeId]);

  return (
    <Layout>
      <section className="container py-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold">Messages</h1>
              <p className="text-sm text-muted-foreground">Chat with the admin team. Only admins can reply.</p>
            </div>
            <Button onClick={() => createConversation.mutate()} disabled={createConversation.isPending}>
              {createConversation.isPending ? "Starting..." : "New conversation"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="md:col-span-1 h-[520px] overflow-hidden">
              <CardContent className="p-0 h-full flex flex-col">
                <div className="px-4 py-3 border-b bg-muted/60 text-sm font-medium">Admin team</div>
                <div className="flex-1 overflow-auto divide-y">
                  {conversations.map((c: any) => (
                    <button
                      key={c.id}
                      className={`w-full px-4 py-2.5 text-left hover:bg-muted/70 transition ${c.id === activeId ? "bg-muted" : ""}`}
                      onClick={() => setActiveId(c.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {"A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.assignee_role ? c.assignee_role.replace(/_/g, " ") : "Admin team"}</div>
                          <div className="text-[11px] text-muted-foreground truncate">Updated {new Date(c.updated_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!conversations.length && (
                    <div className="p-4 text-sm text-muted-foreground">No conversations yet. Start one to message admin.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 h-[520px] flex flex-col shadow-sm">
              <CardContent className="p-0 h-full flex flex-col">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {"A"}
                    </div>
                    <div>
                      <div className="font-semibold">Admin team</div>
                      <div className="text-xs text-muted-foreground">{conversationStatus}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Stored as ciphertext</div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 overflow-auto px-4 py-3 space-y-2.5 bg-muted/40">
                  {activeMessages.map((m: any) => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-white border"}`}>
                          <div className="whitespace-pre-wrap">{m.ciphertext}</div>
                          <div className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!activeMessages.length && <div className="text-sm text-muted-foreground">No messages yet.</div>}
                </div>

                <div className="border-t px-4 py-3 bg-white">
                  <form
                    className="flex items-center gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage.mutate();
                    }}
                  >
                    <Input
                      placeholder="Type a message"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="rounded-full text-sm"
                    />
                    <Button type="submit" disabled={sendMessage.isPending || !activeId} className="rounded-full px-4 text-sm">
                      {sendMessage.isPending ? "Sending..." : "Send"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}