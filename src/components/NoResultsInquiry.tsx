import { SearchX, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "+260977760291";

interface NoResultsInquiryProps {
  search: string;
  productType: string;
}

export default function NoResultsInquiry({ search, productType }: NoResultsInquiryProps) {
  const whatsappMessage = encodeURIComponent(
    search
      ? `Hi ScanLab! I'm looking for "${search}" in ${productType}. Could you help me find it?`
      : `Hi ScanLab! I'm looking for ${productType} but couldn't find what I need on your website. Could you help?`
  );

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <SearchX className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-heading font-semibold text-foreground">
        No results found{search ? ` for "${search}"` : ""}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        We may still have what you're looking for! Reach out to us on WhatsApp and our team will check availability for you.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <Button asChild size="lg" className="gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-5 w-5" fill="white" />
            Ask on WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <a href={`tel:${WHATSAPP_NUMBER}`}>
            <Phone className="h-4 w-4" />
            Call Us
          </a>
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Typical response time: under 5 minutes during business hours
      </p>
    </div>
  );
}
