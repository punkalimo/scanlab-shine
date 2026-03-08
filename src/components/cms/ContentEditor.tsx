import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Home, Info, Megaphone, Star, Megaphone as CtaIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ContentEditor() {
  const [heroContent, setHeroContent] = useState<Record<string, string>>({});
  const [aboutContent, setAboutContent] = useState<Record<string, string>>({});
  const [featuresContent, setFeaturesContent] = useState<Record<string, string>>({});
  const [ctaContent, setCtaContent] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["cms-content-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_pages").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (pages) {
      const hero = pages.find((p: any) => p.page_key === "homepage_hero");
      const about = pages.find((p: any) => p.page_key === "about");
      const features = pages.find((p: any) => p.page_key === "features");
      const cta = pages.find((p: any) => p.page_key === "cta");
      if (hero) setHeroContent(hero.content as any);
      if (about) setAboutContent(about.content as any);
      if (features) setFeaturesContent(features.content as any);
      if (cta) setCtaContent(cta.content as any);
      setHasChanges(false);
    }
  }, [pages]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const upserts = [
        { page_key: "homepage_hero", content: heroContent, title: "Homepage Hero" },
        { page_key: "about", content: aboutContent, title: "About" },
        { page_key: "features", content: featuresContent, title: "Why Choose Us" },
        { page_key: "cta", content: ctaContent, title: "CTA Section" },
      ];
      for (const item of upserts) {
        const { data: existing } = await supabase
          .from("content_pages")
          .select("id")
          .eq("page_key", item.page_key)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("content_pages")
            .update({ content: item.content as any, updated_at: now })
            .eq("page_key", item.page_key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("content_pages")
            .insert({ page_key: item.page_key, title: item.title, content: item.content as any });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-content-pages"] });
      toast({ title: "Content saved successfully" });
      setHasChanges(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateHero = (key: string, value: string) => {
    setHeroContent((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateAbout = (key: string, value: string) => {
    setAboutContent((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

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
          <h2 className="text-2xl font-heading font-bold text-foreground">Content Editor</h2>
          <p className="text-muted-foreground text-sm">Edit your website pages content</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save All"}
        </Button>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="hero" className="gap-2"><Home className="w-4 h-4" /> Homepage Hero</TabsTrigger>
          <TabsTrigger value="about" className="gap-2"><Info className="w-4 h-4" /> About Page</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-6">
          <div className="grid gap-5">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" /> Announcement Banner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Leave empty to hide. E.g. 🎉 Grand Sale — 20% off all audio!"
                  value={heroContent.announcement ?? ""}
                  onChange={(e) => updateHero("announcement", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Shown at the top of the homepage when not empty</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Tag Line</Label>
                  <Input value={heroContent.tagline ?? ""} onChange={(e) => updateHero("tagline", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Main Heading</Label>
                  <Input value={heroContent.heading ?? ""} onChange={(e) => updateHero("heading", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtext</Label>
                  <Textarea value={heroContent.subtext ?? ""} onChange={(e) => updateHero("subtext", e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input value={aboutContent.story_title ?? ""} onChange={(e) => updateAbout("story_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Paragraph 1</Label>
                <Textarea value={aboutContent.story_p1 ?? ""} onChange={(e) => updateAbout("story_p1", e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Paragraph 2</Label>
                <Textarea value={aboutContent.story_p2 ?? ""} onChange={(e) => updateAbout("story_p2", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
