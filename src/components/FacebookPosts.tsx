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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
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
      </div>
    </section>
  );
}
