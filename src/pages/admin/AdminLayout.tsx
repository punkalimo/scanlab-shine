import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Mail, LogOut, ShoppingCart, Users, Warehouse, DollarSign, Truck, BarChart3, ArrowLeft, Home, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { to: "/admin/payments", label: "Payments", icon: DollarSign },
  { to: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { to: "/admin/inquiries", label: "Inquiries", icon: Mail },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-nav text-nav-foreground flex flex-col shrink-0">
        <div className="p-6 font-heading text-lg font-bold">Admin Panel</div>
        <nav className="flex-1 px-3 space-y-1">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-nav-foreground/20">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-nav-foreground hover:bg-primary/10 mb-2"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" /> Back to Main Site
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-nav-foreground hover:bg-primary/10" onClick={async () => { await signOut(); window.location.href = "/login"; }}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 bg-background p-8 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
