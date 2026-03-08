import { motion } from "framer-motion";
import { Facebook } from "lucide-react";

/**
 * Embeds the ScanLab Motor Spares Facebook Page timeline.
 * Uses the Facebook Page Plugin (iframe) — no API key required.
 * Replace the `href` value below with the actual Facebook Page URL.
 */
const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=100063526975628";

export default function FacebookPosts() {
  return (
    <section className="bg-muted py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Facebook className="h-6 w-6 text-primary" />
            <h2 className="text-3xl md:text-4xl font-heading font-bold">Latest From Facebook</h2>
          </div>
          <p className="text-muted-foreground">Stay updated with our latest posts and offers</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Facebook Feed — Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <iframe
              title="ScanLab Motor Spares Facebook Feed"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FACEBOOK_PAGE_URL)}&tabs=timeline&width=500&height=600&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`}
              width="500"
              height="600"
              style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              loading="lazy"
            />
          </motion.div>

          {/* Right — Why Follow Us + Testimonials */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-heading font-bold mb-3">Why Follow Us?</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Be the first to know about <strong className="text-foreground">new stock arrivals</strong> and product launches</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Access <strong className="text-foreground">exclusive deals</strong> and seasonal promotions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Get expert <strong className="text-foreground">tips & advice</strong> on truck maintenance and audio installs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Join a growing community of <strong className="text-foreground">transport professionals</strong> across Zambia</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-heading font-bold mb-4">What Our Customers Say</h3>
              <div className="space-y-4">
                {[
                  { name: "James M.", text: "ScanLab always has the parts I need. Fast service and fair prices — my go-to for fleet maintenance." },
                  { name: "Grace K.", text: "Installed a full Pioneer system from ScanLab. The sound quality is incredible and the team was very helpful!" },
                  { name: "David C.", text: "Reliable supplier for our Scania and Volvo trucks. They understand the transport business." },
                ].map((t) => (
                  <div key={t.name} className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                    <p className="mt-2 text-xs font-semibold text-foreground">— {t.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
