import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (values: ContactForm) => {
    setSubmitting(true);
    const { error } = await supabase.from("inquiries").insert([{
      name: values.name,
      email: values.email,
      subject: values.subject,
      message: values.message,
    }]);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Message sent!", description: "Thank you — we'll get back to you soon." });
    form.reset();
  };

  return (
    <Layout>
      <section className="bg-nav text-nav-foreground py-16">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">We'd love to hear from you. Send us a message!</p>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl><Input placeholder="What's this about?" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea placeholder="Tell us more..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? "Sending..." : "Send Message"} <Send className="h-4 w-4" />
                </Button>
              </form>
            </Form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-bold">Get In Touch</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Address</h3>
                  <p className="text-sm text-muted-foreground">1563 Kalambo Road, Light Industrial Area, Lusaka, Zambia</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Phone</h3>
                  <p className="text-sm text-muted-foreground">+260 977 123 456</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Email</h3>
                  <p className="text-sm text-muted-foreground">info@scanlabmotors.com</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-6">
              <h3 className="font-heading font-semibold mb-2">Business Hours</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Monday – Friday: 8:00 AM – 5:00 PM</p>
                <p>Saturday: 8:00 AM – 1:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
