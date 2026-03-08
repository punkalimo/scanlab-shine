import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Wrench, ShoppingCart, User, Package, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/spares", label: "Spares" },
  { to: "/audio", label: "Audio" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-nav text-nav-foreground shadow-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
          <Wrench className="h-6 w-6 text-primary" />
          <span>Scanlab</span>
          <span className="text-primary">Motors</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === link.to
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary/10 hover:text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Cart */}
          <Link
            to="/cart"
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors relative",
              pathname === "/cart"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-primary/10 hover:text-primary"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                {cartCount > 9 ? "9+" : cartCount}
              </Badge>
            )}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary/10 hover:text-primary"
              )}
            >
              Admin
            </Link>
          )}
          
          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="text-nav-foreground">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-nav-foreground">
                  <Package className="h-4 w-4 mr-2" />
                  Orders
                </Button>
              </Link>
              <Link to="/messages">
                <Button variant="ghost" size="sm" className="text-nav-foreground">
                  Messages
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { 
                  console.log("Logout clicked, forcing logout");
                  // Clear localStorage manually
                  localStorage.clear();
                  // Force redirect
                  window.location.href = '/login';
                }}
                className="text-nav-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline" className="ml-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Login
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="text-nav-foreground relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                  {cartCount > 9 ? "9+" : cartCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-nav-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-nav text-nav-foreground w-64">
              <SheetTitle className="text-nav-foreground">Navigation</SheetTitle>
              <nav className="flex flex-col gap-2 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-md text-sm font-medium transition-colors",
                      pathname === link.to
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/10"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/cart" onClick={() => setOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium hover:bg-primary/10 flex items-center justify-between">
                  Cart
                  {cartCount > 0 && (
                    <Badge className="bg-red-500">{cartCount}</Badge>
                  )}
                </Link>
                {user && (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium hover:bg-primary/10 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                    <Link to="/orders" onClick={() => setOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium hover:bg-primary/10">
                      My Orders
                    </Link>
                    <Link to="/messages" onClick={() => setOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium hover:bg-primary/10">
                      Messages
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium hover:bg-primary/10">
                    Admin Dashboard
                  </Link>
                )}
                {!user ? (
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button className="w-full mt-2">Login</Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => { console.log("Mobile logout clicked"); signOut(); setOpen(false); navigate("/login"); }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
