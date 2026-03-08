import { motion } from "framer-motion";
import { MapPin, Truck, Music, Shield, Users } from "lucide-react";
import Layout from "@/components/Layout";

const brands = [
  "International", "Freightliner", "Volvo", "Scania", "Howo",
  "MAN", "DAF", "Isuzu", "Mitsubishi", "Toyota",
];

export default function About() {
  return (
    <Layout>
      <section className="bg-nav text-nav-foreground py-16">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-heading font-bold">About Scanlab Motor Spares</h1>
          <p className="mt-2 text-muted-foreground">Proudly Zambian. Passionately driven.</p>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-heading font-bold mb-4">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed">
              Scanlab Motor Spares is a proudly Zambian-owned company specializing in truck and trailer spare parts 
              as well as premium car audio and accessories. Located on Kalambo Road in Lusaka's Light Industrial Area, 
              we serve the transport industry with genuine, high-quality products sourced from trusted manufacturers worldwide.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Our mission is to provide our customers with reliable, competitively priced motor spares and audio solutions, 
              backed by expert advice and exceptional service. We believe in building long-term relationships based on trust, 
              quality, and value.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: Truck, label: "Truck Spares", desc: "All major brands" },
              { icon: Music, label: "Car Audio", desc: "Premium systems" },
              { icon: Shield, label: "Genuine Parts", desc: "Quality guaranteed" },
              { icon: Users, label: "Expert Team", desc: "Knowledgeable staff" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-card p-5 text-center">
                <item.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-heading font-semibold text-sm">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Brands */}
      <section className="bg-muted py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-heading font-bold mb-8">Brands We Serve</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {brands.map((brand) => (
              <span key={brand} className="rounded-full bg-card px-5 py-2 text-sm font-medium border shadow-sm">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="container py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-heading font-bold flex items-center justify-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Find Us
          </h2>
          <p className="text-muted-foreground mt-2">1563 Kalambo Road, Light Industrial Area, Lusaka, Zambia</p>
        </div>
        <div className="rounded-xl overflow-hidden shadow-lg">
          <iframe
            title="Scanlab Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3846.5!2d28.28!3d-15.42!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTXCsDI1JzEyLjAiUyAyOMKwMTYnNDguMCJF!5e0!3m2!1sen!2szm!4v1"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </Layout>
  );
}
