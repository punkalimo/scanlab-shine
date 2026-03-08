import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Music, Shield, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const features = [
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

const categories = [
  {
    title: "Truck & Trailer Spares",
    description: "Engine parts, filters, batteries, brakes, and more for all major brands.",
    icon: Truck,
    link: "/spares",
    color: "bg-primary",
  },
  {
    title: "Audio & Accessories",
    description: "Car audio systems, speakers, subwoofers, alarms, and dash cameras.",
    icon: Music,
    link: "/audio",
    color: "bg-accent",
  },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-nav text-nav-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <span className="inline-block rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              New Generation of Genuine Products
            </span>
            <h1 className="text-4xl md:text-6xl font-heading font-bold leading-tight">
              Your Trusted Partner for{" "}
              <span className="text-primary">Motor Spares</span> in Zambia
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Quality truck & trailer spares and premium car audio accessories — all under one roof at Scanlab Motor Spares.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/spares">
                <Button size="lg" className="gap-2">
                  Browse Spares <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-nav-foreground/30 text-nav-foreground hover:bg-nav-foreground/10">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
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
          {categories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Link to={cat.link} className="group block">
                <div className="rounded-xl border bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className={`inline-flex rounded-lg p-3 ${cat.color} text-white mb-4`}>
                    <cat.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold">{cat.title}</h3>
                  <p className="mt-2 text-muted-foreground">{cat.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-muted py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold">Why Choose Scanlab?</h2>
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
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-primary p-12 text-primary-foreground"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Ready to Order?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-md mx-auto">
            Get in touch with us today for competitive prices and expert advice on all your motor spares needs.
          </p>
          <Link to="/contact">
            <Button size="lg" variant="secondary" className="mt-6 gap-2">
              Contact Us <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </Layout>
  );
}
