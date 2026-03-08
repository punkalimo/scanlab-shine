import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import DarkModeToggle from "./DarkModeToggle";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/spares", label: "Spares" },
  { to: "/audio", label: "Audio & Accessories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-nav text-nav-foreground shadow-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
          <Wrench className="h-6 w-6 text-primary" />
          <span>ScanLab</span>
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
          <DarkModeToggle />
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1">
          <DarkModeToggle />
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
