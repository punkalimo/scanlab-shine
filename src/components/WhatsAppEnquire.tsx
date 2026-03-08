import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "+260977760291";

interface WhatsAppEnquireProps {
  productName: string;
  className?: string;
}

export default function WhatsAppEnquire({ productName, className }: WhatsAppEnquireProps) {
  const message = encodeURIComponent(`Hi ScanLab! I'd like to enquire about: ${productName}`);

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-[#1ebe57] transition-colors ${className ?? ""}`}
    >
      <MessageCircle className="w-3.5 h-3.5" fill="white" />
      Enquire
    </a>
  );
}
