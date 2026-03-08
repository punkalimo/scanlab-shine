import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { api } from "@/integrations/api/client";

const assigneeRoles = ["admin", "accountant", "store_officer", "product_manager", "support_agent"];

export default function AdminMessages() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [assigneeRole, setAssigneeRole] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [initialMessage, setInitialMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const convoQuery = useQuery({
    queryKey: ["admin", "conversations"],
    queryFn: async () => api.adminGetConversations() as any,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: async () => api.getAllUsers() as any,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const messagesQuery = useQuery({
    queryKey: ["admin", "conversations", activeId, "messages"],
    queryFn: async () => {
      if (!activeId) return { messages: [] } as any;
      return api.adminGetConversationMessages(activeId) as any;
    },
    enabled: !!activeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!activeId && convoQuery.data?.conversations?.length) {
      setActiveId(convoQuery.data.conversations[0].id);
    }
  }, [activeId, convoQuery.data]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!activeId) throw new Error("No conversation selected");
      const ciphertext = draft.trim();
      if (!ciphertext) throw new Error("Message is empty");
      return api.adminSendConversationMessage(activeId, { ciphertext }) as any;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations", activeId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations"] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const assignConversation = useMutation({
    mutationFn: async () => {
      if (!activeId) throw new Error("No conversation selected");
      const roleToSend = assigneeRole === "unassigned" ? null : assigneeRole;
      return api.adminAssignConversation(activeId, { assignee_role: roleToSend }) as any;
    },
    onSuccess: () => {
      toast({ title: "Assignment updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations"] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const startConversation = useMutation({
    mutationFn: async () => {
      if (!targetUserId) throw new Error("Select a user");
      const body: any = { user_id: targetUserId };
      const trimmed = initialMessage.trim();
      if (trimmed) body.ciphertext = trimmed;
      return api.adminCreateConversation(body) as any;
    },
    onSuccess: (data: any) => {
      toast({ title: data?.reused ? "Conversation reused" : "Conversation started" });
      setInitialMessage("");
      if (data?.conversation?.id) {
        setActiveId(data.conversation.id);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "conversations"] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const conversations = convoQuery.data?.conversations || [];
  const users = usersQuery.data?.users || [];
  const activeMessages = messagesQuery.data?.messages || [];
  const activeConversation = conversations.find((c: any) => c.id === activeId);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeMessages, activeId]);

  if (convoQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading conversations…</div>;
  }

  if (convoQuery.isError) {
    const message = (convoQuery.error as any)?.message || "Failed to load conversations";
    return <div className="p-6 text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-heading font-bold">Start a conversation</h2>
              <p className="text-sm text-muted-foreground">Pick a user and optionally send the first message.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email} {u.full_name ? `(${u.full_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Optional first message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
            />
            <Button
              onClick={() => startConversation.mutate()}
              disabled={startConversation.isPending || !targetUserId}
              className="whitespace-nowrap"
            >
              {startConversation.isPending ? "Starting..." : "Start"}
            </Button>
          </div>
          {usersQuery.isLoading && <div className="text-sm text-muted-foreground">Loading users…</div>}
          {usersQuery.isError && (
            <div className="text-sm text-destructive">{(usersQuery.error as any)?.message || "Failed to load users"}</div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Customer on the left, admin replies on the right.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={assigneeRole} onValueChange={setAssigneeRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assign role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assigneeRoles.map((r) => (
                <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => assignConversation.mutate()} disabled={!activeId || assignConversation.isPending}>
            {assignConversation.isPending ? "Saving..." : "Assign"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="md:col-span-1 h-[520px] overflow-hidden shadow-sm">
          <CardContent className="p-0 h-full">
            <div className="px-4 py-3 border-b bg-muted/60 text-sm font-medium">Conversations</div>
            <div className="divide-y h-full overflow-auto">
              {conversations.map((c: any) => (
                <button
                  key={c.id}
                  className={`w-full text-left px-4 py-2.5 hover:bg-muted/70 transition ${c.id === activeId ? "bg-muted" : ""}`}
                  onClick={() => {
                    setActiveId(c.id);
                    setAssigneeRole(c.assignee_role || "unassigned");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {c.user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.user?.email || c.user_id}</div>
                      <div className="text-[11px] text-muted-foreground flex gap-2">
                        <span>{c.assignee_role ? c.assignee_role.replace(/_/g, " ") : "Unassigned"}</span>
                        <span>{new Date(c.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {!conversations.length && <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 h-[520px] flex flex-col shadow-sm">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {activeConversation?.user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-semibold">{activeConversation?.user?.email || "Select a conversation"}</div>
                  <div className="text-xs text-muted-foreground">{activeConversation?.user?.full_name || activeConversation?.user?.role || ""}</div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">Encrypted payloads; decrypt client-side.</div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-auto px-4 py-3 space-y-2.5 bg-muted/40">
              {messagesQuery.isError && (
                <div className="text-sm text-destructive">
                  {(messagesQuery.error as any)?.message || "Failed to load messages"}
                </div>
              )}
              {!messagesQuery.isError && activeMessages.map((m: any) => {
                const isAdmin = m.sender_role === "admin";
                return (
                  <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${isAdmin ? "bg-primary text-primary-foreground" : "bg-white border"}`}>
                      <div className="whitespace-pre-wrap">{m.ciphertext}</div>
                      <div className={`mt-1 text-[10px] ${isAdmin ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!messagesQuery.isError && !activeMessages.length && <div className="text-sm text-muted-foreground">No messages yet.</div>}
            </div>

            <div className="border-t px-4 py-3 bg-white">
              <form
                className="flex gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage.mutate();
                }}
              >
                <Input
                  placeholder="Type a reply"
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
  );
}