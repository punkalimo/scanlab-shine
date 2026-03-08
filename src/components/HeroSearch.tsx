import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("spares");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/${type}?search=${encodeURIComponent(query)}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="mt-10 flex flex-col sm:flex-row items-stretch gap-3 bg-card/90 backdrop-blur rounded-xl p-3 border border-border/50 shadow-xl max-w-xl"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for parts or audio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
        />
      </div>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-full sm:w-[140px] border-0 bg-muted/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="spares">Spares</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="gap-2">
        <Search className="h-4 w-4" /> Search
      </Button>
    </form>
  );
}
