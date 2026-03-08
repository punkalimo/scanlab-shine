import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, ShieldAlert, ShieldCheck, UserX, UserPlus, Trash2, Copy, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { api } from "@/integrations/api/client";

const roleColors: Record<string, string> = {
  admin: "bg-red-500",
  accountant: "bg-purple-500",
  store_officer: "bg-blue-500",
  product_manager: "bg-orange-500",
  support_agent: "bg-teal-500",
  customer: "bg-green-500",
};

const roleOptions = [
  { value: "admin", label: "Admin", icon: ShieldAlert },
  { value: "accountant", label: "Accountant", icon: ShieldCheck },
  { value: "store_officer", label: "Store Officer", icon: ShieldCheck },
  { value: "product_manager", label: "Product Manager", icon: Shield },
  { value: "support_agent", label: "Support Agent", icon: User },
  { value: "customer", label: "Customer", icon: User },
];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ email: string; link: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", full_name: "", phone: "", role: "customer" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", roleFilter],
    queryFn: async () => {
      const roleParam = roleFilter === "all" ? undefined : roleFilter;
      const result = await api.getAllUsers(roleParam);
      return result as any;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.updateUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User role updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await api.toggleUserActive(userId, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await api.adminGeneratePasswordLink(userId);
      return result as any;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      const targetUser = users.find((u: any) => u.id === userId);
      if (data?.password_link) {
        setLinkDialog({ email: targetUser?.email || data.email || "", link: data.password_link });
        toast({ title: "Password link generated" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...createForm, role: createForm.role || "customer" };
      const result = await api.adminCreateUser(payload);
      return result as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setCreateOpen(false);
      setCreateForm({ email: "", full_name: "", phone: "", role: "customer" });
      if (data?.password_link) {
        setLinkDialog({ email: data?.user?.email || data?.email || "", link: data.password_link });
      }
      toast({ title: "User created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.adminDeleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User deleted" });
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const users = data?.users || [];
  
  const filteredUsers = users.filter((user: any) => {
    if (!user) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      (user.email?.toLowerCase() || '').includes(searchLower) ||
      (user.full_name?.toLowerCase() || '').includes(searchLower) ||
      (user.phone || '').includes(searchQuery)
    );
  });

  const userPendingDeletion = users.find((u: any) => u.id === userToDelete);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading users: {(error as any)?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold">Users</h1>
        <div className="flex gap-4">
          <Input 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[250px]"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add user
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role] || "bg-gray-500"}>
                        {user.role?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={user.role && roleOptions.some(o => o.value === user.role) ? user.role : "customer"}
                          onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-[150px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {user.is_active ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ userId: user.id, isActive: false })}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ userId: user.id, isActive: true })}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateLinkMutation.mutate(user.id)}
                          disabled={generateLinkMutation.isPending}
                        >
                          <Link2 className="h-4 w-4" /> {user.password_set ? "Reset PW" : "Send Link"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setUserToDelete(user.id)}
                          disabled={deleteUserMutation.isPending && userToDelete === user.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
                <DialogDescription>Invite a user by email and assign their role. They will set their own password from the link.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
                <Input
                  placeholder="Full name (optional)"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                />
                <Input
                  placeholder="Phone (optional)"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
                <Select value={createForm.role} onValueChange={(role) => setCreateForm({ ...createForm, role })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createUserMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate()}
                  disabled={!createForm.email || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Creating..." : "Create & copy link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!linkDialog} onOpenChange={(open) => {
            if (!open) setLinkDialog(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Password setup link</DialogTitle>
                <DialogDescription>Share this link with the user so they can set their password.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{linkDialog?.email}</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={linkDialog?.link || ""} className="flex-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      if (linkDialog?.link) {
                        await navigator.clipboard.writeText(linkDialog.link);
                        toast({ title: "Link copied" });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setLinkDialog(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!userToDelete} onOpenChange={(open) => {
        if (!open) {
          setUserToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              {userPendingDeletion?.email || "This user"} will lose access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete);
                }
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
