import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Wrench } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-nav text-nav-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-heading text-xl font-bold mb-4">
              <Wrench className="h-6 w-6 text-primary" />
              <span>Scanlab</span>
              <span className="text-primary">Motors</span>
            </div>
            <p className="text-sm text-muted-foreground">
              New Generation of Genuine Products. Your trusted partner for truck spares and car audio in Zambia.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Quick Links</h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <Link to="/spares" className="hover:text-primary transition-colors">Truck Spares</Link>
              <Link to="/audio" className="hover:text-primary transition-colors">Audio & Accessories</Link>
              <Link to="/about" className="hover:text-primary transition-colors">About Us</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Contact Us</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>1563 Kalambo Road, Light Industrial Area, Lusaka</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>+260 977 123 456</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>info@scanlabmotors.com</span>
              </div>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Facebook className="h-4 w-4 text-primary" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-8 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Scanlab Motor Spares. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
