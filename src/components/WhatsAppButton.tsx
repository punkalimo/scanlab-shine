import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useCmsData";

const WHATSAPP_MESSAGE = encodeURIComponent("Hi Scanlab Motor Spares! I'd like to inquire about your products.");

export default function WhatsAppButton() {
  const { data: settings = {} } = useSiteSettings();
  const whatsapp = settings.whatsapp?.replace(/\s/g, "") || "+260977760291";

  return (
    <motion.a
      href={`https://wa.me/${whatsapp}?text=${WHATSAPP_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe57] transition-colors"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </motion.a>
  );
}
