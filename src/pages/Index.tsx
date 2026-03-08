import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Music, Shield, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import FacebookPosts from "@/components/FacebookPosts";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroSearch from "@/components/HeroSearch";
import heroTrucks from "@/assets/hero-trucks.jpg";
import heroSpares from "@/assets/hero-spares.jpg";
import heroAudio from "@/assets/hero-audio.jpg";

// Static logo fallback map
import logoInternational from "@/assets/brands/international.png";
import logoFreightliner from "@/assets/brands/freightliner.png";
import logoVolvo from "@/assets/brands/volvo.png";
import logoScania from "@/assets/brands/scania.png";
import logoHowo from "@/assets/brands/howo.png";
import logoMan from "@/assets/brands/man.png";
import logoDaf from "@/assets/brands/daf.png";
import logoIsuzu from "@/assets/brands/isuzu.png";
import logoMitsubishi from "@/assets/brands/mitsubishi.png";
import logoToyota from "@/assets/brands/toyota.png";
import logoPioneer from "@/assets/brands/pioneer.png";
import logoJbl from "@/assets/brands/jbl.png";
import logoKenwood from "@/assets/brands/kenwood.png";
import logoSony from "@/assets/brands/sony.png";
import logoAlpine from "@/assets/brands/alpine.png";
import logoBlaupunkt from "@/assets/brands/blaupunkt.png";

const staticLogos: Record<string, string> = {
  International: logoInternational, Freightliner: logoFreightliner,
  Volvo: logoVolvo, Scania: logoScania, Howo: logoHowo, MAN: logoMan,
  DAF: logoDaf, Isuzu: logoIsuzu, Mitsubishi: logoMitsubishi, Toyota: logoToyota,
  Pioneer: logoPioneer, JBL: logoJbl, Kenwood: logoKenwood, Sony: logoSony,
  Alpine: logoAlpine, Blaupunkt: logoBlaupunkt,
};

const defaultFeatures = [
  {
    icon: Shield,
    title: "Genuine Products",
    description: "We source only authentic, high-quality parts from trusted manufacturers worldwide.",
  },
  {
    icon: Truck,
    title: "Wide Range",
    description: "From International to Volvo, Scania to Howo — we cover all major truck brands.",
  },
  {
    icon: Star,
    title: "Zambian Owned",
    description: "Proudly Zambian, serving the local transport industry with dedication since day one.",
  },
];

const featureIcons = [Shield, Truck, Star];

export default function Index() {
  // Fetch dynamic brands
  const { data: dbBrands = [] } = useQuery({
    queryKey: ["public-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch dynamic content
  const { data: contentPages = [] } = useQuery({
    queryKey: ["public-content-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_pages").select("*");
      if (error) throw error;
      return data;
    },
  });

  const truckBrands = dbBrands
    .filter((b) => b.brand_type === "truck")
    .map((b) => ({ name: b.name, logo: b.logo_url || staticLogos[b.name] || "" }));
  const audioBrands = dbBrands
    .filter((b) => b.brand_type === "audio")
    .map((b) => ({ name: b.name, logo: b.logo_url || staticLogos[b.name] || "" }));

  // Content from CMS
  const heroPage = contentPages.find((p) => p.page_key === "homepage_hero");
  const heroContent = (heroPage?.content as Record<string, string>) || {};
  const featuresPage = contentPages.find((p) => p.page_key === "features");
  const featuresContent = (featuresPage?.content as Record<string, string>) || {};
  const ctaPage = contentPages.find((p) => p.page_key === "cta");
  const ctaContent = (ctaPage?.content as Record<string, string>) || {};

  const features = defaultFeatures.map((f, i) => ({
    ...f,
    icon: featureIcons[i],
    title: featuresContent[`f${i + 1}_title`] || f.title,
    description: featuresContent[`f${i + 1}_desc`] || f.description,
  }));
  return (
    <Layout>
      {/* Hero with background image */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="absolute inset-0">
          <img src={heroTrucks} alt="Fleet of trucks" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-nav/80" />
        </div>
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <span className="inline-block rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              {heroContent.tagline || "New Generation of Genuine Products"}
            </span>
            <h1 className="text-4xl md:text-6xl font-heading font-bold leading-tight text-nav-foreground">
              {heroContent.heading || <>Your Trusted Partner for{" "}<span className="text-primary">Motor Spares</span> in Zambia</>}
            </h1>
            <p className="mt-6 text-lg text-nav-foreground/70 max-w-lg">
              {heroContent.subtext || "Quality truck & trailer spares and premium car audio accessories — all under one roof at ScanLab Motor Spares."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/spares">
                <Button size="lg" className="gap-2">
                  Browse Spares <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="default" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  Get in Touch
                </Button>
              </Link>
            </div>

            {/* Hero Search */}
            <HeroSearch />
          </motion.div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <FeaturedProducts />

      {/* What We Offer - with images */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold">What We Offer</h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Two specialized product lines to keep you moving.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              title: "Truck & Trailer Spares",
              description: "Engine parts, filters, batteries, brakes, bearings, gaskets and more for all major truck and trailer brands.",
              image: heroSpares,
              link: "/spares",
              color: "bg-primary",
              icon: Truck,
            },
            {
              title: "Audio & Accessories",
              description: "Car audio systems, speakers, subwoofers, amplifiers, alarms, dash cameras and accessories.",
              image: heroAudio,
              link: "/audio",
              color: "bg-accent",
              icon: Music,
            },
          ].map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Link to={cat.link} className="group block">
                <div className="rounded-xl border bg-card overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`inline-flex rounded-lg p-2 ${cat.color} text-primary-foreground`}>
                        <cat.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-2xl font-heading font-bold">{cat.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{cat.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                      Explore <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Brands We Serve */}
      <section className="bg-muted py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold">Brands We Serve</h2>
            <p className="mt-3 text-muted-foreground">Trusted names in trucking and audio</p>
          </motion.div>

          <div className="mb-10">
            <h3 className="text-lg font-heading font-semibold mb-4 text-center text-muted-foreground">Truck & Trailer Brands</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {truckBrands.map((brand, i) => (
                <motion.div
                  key={brand.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 w-28 border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <img src={brand.logo} alt={brand.name} className="h-12 w-12 object-contain" />
                  <span className="text-xs font-medium text-foreground">{brand.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-heading font-semibold mb-4 text-center text-muted-foreground">Audio Brands</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {audioBrands.map((brand, i) => (
                <motion.div
                  key={brand.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 w-28 border shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <img src={brand.logo} alt={brand.name} className="h-12 w-12 object-contain" />
                  <span className="text-xs font-medium text-foreground">{brand.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Why Choose ScanLab?</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Facebook Posts */}
      <FacebookPosts />

      {/* CTA */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-primary p-12 text-primary-foreground"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold">{ctaContent.heading || "Need Motor Spares?"}</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-md mx-auto">
            {ctaContent.subtext || "Get in touch with us today for competitive prices and expert advice on all your motor spares needs."}
          </p>
          <Link to="/contact">
            <Button size="lg" variant="secondary" className="mt-6 gap-2">
              {ctaContent.button_text || "Contact Us"} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </Layout>
  );
}
