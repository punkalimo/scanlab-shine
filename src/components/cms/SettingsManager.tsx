import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, Building2, Phone, Mail, MapPin, Globe, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SETTING_FIELDS = [
  { key: "business_name", label: "Business Name", icon: Building2, type: "text" },
  { key: "phone", label: "Phone Number", icon: Phone, type: "text" },
  { key: "whatsapp", label: "WhatsApp Number", icon: Phone, type: "text" },
  { key: "email", label: "Email Address", icon: Mail, type: "text" },
  { key: "address", label: "Physical Address", icon: MapPin, type: "textarea" },
  { key: "facebook_url", label: "Facebook URL", icon: Globe, type: "text" },
  { key: "instagram_url", label: "Instagram URL", icon: Globe, type: "text" },
  { key: "working_hours", label: "Working Hours", icon: Clock, type: "text" },
] as const;

export default function SettingsManager() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["cms-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setValues(map);
      setHasChanges(false);
    }
  }, [settings]);

  const updateField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(values).map(([key, value]) =>
        supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key)
      );
      const results = await Promise.all(promises);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-site-settings"] });
      toast({ title: "Settings saved successfully" });
      setHasChanges(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Website Settings</h2>
          <p className="text-muted-foreground text-sm">Manage your business information and contact details</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SETTING_FIELDS.map((field) => (
          <Card key={field.key} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <field.icon className="w-4 h-4 text-primary" />
                {field.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {field.type === "textarea" ? (
                <Textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={2}
                />
              ) : (
                <Input
                  value={values[field.key] ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
