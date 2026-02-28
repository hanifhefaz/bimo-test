import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Palette } from "lucide-react";

const THEMES = ["bimo", "warm", "midnight", "lavender", "forest", "sunset", "ocean", "charcoal", "plum", "sage", "taupe"] as const;

export function ThemeSwitcher() {
  const [active, setActive] = useState<string>("bimo");

  useEffect(() => {
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (fromStorage && THEMES.includes(fromStorage as any)) {
      setActive(fromStorage);
    } else {
      // read currently set attribute
      const attr = document.documentElement.getAttribute("data-theme") || "bimo";
      setActive(attr);
    }
  }, []);

  function applyTheme(theme: string) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore storage errors
    }
    setActive(theme);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Palette className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map((t) => (
          <DropdownMenuItem key={t} onClick={() => applyTheme(t)} className="flex items-center justify-between">
            <span className="capitalize">{t}</span>
            {active === t && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;
