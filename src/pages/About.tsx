import { motion } from "framer-motion";
import {
  MapPin, Truck, Shield, Users, Clock, Target, Wrench,
  Zap, Cog, Droplets, Lightbulb, CircleDot, Fuel,
  CheckCircle2, ChevronRight, Headphones,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useContentPage, useBrands, useSiteSettings } from "@/hooks/useCmsData";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import aboutWarehouse from "@/assets/about-warehouse.jpg";
import aboutMechanic from "@/assets/about-mechanic.jpg";
import aboutFleet from "@/assets/about-trucks-fleet.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const truckBrandsList = [
  "International", "Hino", "Howo", "Henred Fruehauf", "Scania",
  "DAF", "Freightliner", "Volvo", "Shacman", "Load Trail",
];

const partCategories = [
  {
    title: "Pneumatics",
    icon: CircleDot,
    items: ["Hydraulic Pumps", "Steering Pumps", "Valves", "Rubber Hose & Nylon Pipes", "Air & Fuel Hoses", "Bottle Jacks"],
  },
  {
    title: "Driveline",
    icon: Cog,
    items: ["Gearbox Components", "Diffs", "Universal Joints", "Propshafts", "Centre Bearings", "Half Shafts", "Crown Wheels"],
  },
  {
    title: "Electricals",
    icon: Zap,
    items: ["Bulbs", "Tail Lamps", "Electric Cables", "Switches", "Marker Lamps", "Head Lamps", "Starter Motors", "Solenoids"],
  },
  {
    title: "Suspension",
    icon: Wrench,
    items: ["Airbags", "Shocks", "Leaf Springs", "U-Bolts", "Bushes", "Brake Pads", "Brake Discs", "Drums", "Hubs", "Brake Shoes", "Studs & Nuts", "Hangers & Scatters", "Brake Boosters", "Landing Legs"],
  },
  {
    title: "Engine Parts",
    icon: Lightbulb,
    items: ["Big End Bearings", "Main Bearings", "Pistons", "Piston Rings", "Conrod Bearings", "Injectors", "Cylinder Head Gaskets", "Stem Valves & Seals"],
  },
  {
    title: "Lubricants & Abrasives",
    icon: Droplets,
    items: ["Engine Oil", "Gear Oil", "Hydraulic Oil", "Grease", "AdBlue"],
  },
];

const values = [
  { icon: Shield, title: "Quality Guaranteed", desc: "Only genuine aftermarket parts from trusted manufacturers." },
  { icon: Target, title: "Tailored Solutions", desc: "Custom solutions crafted for every customer's specific needs." },
  { icon: Clock, title: "Timely Delivery", desc: "Efficient and satisfying solutions delivered on schedule." },
  { icon: Users, title: "Customer First", desc: "Long-term relationships built on trust, value and expertise." },
];

export default function About() {
  const { data: aboutContent = {} } = useContentPage("about");
  const { data: brands = [] } = useBrands();
  const { data: settings = {} } = useSiteSettings();

  const truckBrands = brands.filter((b) => b.brand_type === "truck");
  const audioBrands = brands.filter((b) => b.brand_type === "audio");

  return (
    <Layout>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-nav text-nav-foreground">
        <div className="absolute inset-0">
          <img src={aboutFleet} alt="Truck fleet" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-nav via-nav/90 to-nav/70" />
        </div>
        <div className="container relative py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-block rounded-full bg-primary/20 text-primary px-4 py-1.5 text-sm font-medium mb-4">
              Proudly Zambian Owned
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight">
              About {settings.business_name || "ScanLab Motor Spares"}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Your trusted partner for truck &amp; trailer spare parts — delivering affordable, reliable, and quality solutions across Zambia.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Who We Are</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2 mb-6">
              {aboutContent.story_title || "A Zambian Company Built on Trust"}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              {aboutContent.story_p1 ||
                "We are a Zambian owned limited company that specialises in providing truck and trailer parts at affordable and reliable prices. We stock a wide range of brands for our different clients to assure affordability and constant availability."}
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed text-base">
              {aboutContent.story_p2 ||
                "We believe in tailored-made solutions for every customer to suit their specific needs. We deliver timely, efficiently and satisfying solutions backed by expert advice and exceptional service."}
            </p>
            <div className="mt-8">
              <Link to="/contact">
                <Button size="lg" className="gap-2">
                  Get in Touch <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <AspectRatio ratio={4 / 3}>
                <img src={aboutMechanic} alt="Expert mechanic at work" className="w-full h-full object-cover" />
              </AspectRatio>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground rounded-xl p-5 shadow-lg hidden md:block">
              <p className="text-3xl font-heading font-bold">100%</p>
              <p className="text-sm opacity-90">Zambian Owned</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">Our Core Values</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full border-border/50 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <v.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do – Trucks Served */}
      <section className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <AspectRatio ratio={16 / 9}>
                <img src={aboutFleet} alt="Fleet of trucks" className="w-full h-full object-cover" />
              </AspectRatio>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">What We Do</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2 mb-4">
              Trucks &amp; Trailers We Supply For
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              We are proud suppliers of original aftermarket spares and components for a wide range of trusted truck and trailer brands.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {truckBrandsList.map((brand) => (
                <div key={brand} className="flex items-center gap-2.5 rounded-lg bg-muted px-4 py-2.5">
                  <Truck className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{brand}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Parts Categories */}
      <section className="bg-muted py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Product Range</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">Spare Parts We Stock</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              From engine internals to suspension, electricals to lubricants — we carry everything to keep your fleet running.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <cat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-lg">{cat.title}</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {cat.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Warehouse Image Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img src={aboutWarehouse} alt="Our warehouse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-nav/80 to-transparent flex items-center">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-md text-nav-foreground"
            >
              <h3 className="text-2xl md:text-3xl font-heading font-bold">Fully Stocked Warehouse</h3>
              <p className="mt-2 text-sm opacity-80">Ensuring constant availability of parts for all major truck brands.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Brands from DB */}
      <section className="container py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Trusted Partners</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">Brands We Serve</h2>
        </motion.div>

        {truckBrands.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-heading font-semibold mb-4 text-center text-muted-foreground">Truck &amp; Trailer</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {truckBrands.map((brand) => (
                <span key={brand.id} className="flex items-center gap-2 rounded-lg bg-card px-5 py-2.5 text-sm font-medium border shadow-sm">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 object-contain" />
                  ) : (
                    <Truck className="h-4 w-4 text-primary" />
                  )}
                  {brand.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {audioBrands.length > 0 && (
          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-center text-muted-foreground">Audio &amp; Accessories</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {audioBrands.map((brand) => (
                <span key={brand.id} className="flex items-center gap-2 rounded-lg bg-card px-5 py-2.5 text-sm font-medium border shadow-sm">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 object-contain" />
                  ) : (
                    <Headphones className="h-4 w-4 text-accent" />
                  )}
                  {brand.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Map */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-bold flex items-center justify-center gap-2">
              <MapPin className="h-6 w-6 text-primary" /> Find Us
            </h2>
            <p className="text-muted-foreground mt-2">
              {settings.address || "1563 Kalambo Road, Light Industrial Area, Lusaka, Zambia"}
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              title="ScanLab Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3846.5!2d28.28!3d-15.42!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTXCsDI1JzEyLjAiUyAyOMKwMTYnNDguMCJF!5e0!3m2!1sen!2szm!4v1"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-primary text-primary-foreground p-10 md:p-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Need Truck &amp; Trailer Parts?</h2>
          <p className="mt-3 text-lg opacity-90 max-w-xl mx-auto">
            Get in touch with us today for affordable, genuine aftermarket spares delivered with speed and reliability.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" variant="secondary" className="gap-2">
                Contact Us <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/spares">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                Browse Spares <Truck className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
