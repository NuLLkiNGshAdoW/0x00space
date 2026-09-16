import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";

const KEY = "0x00space_favorites";

export default function FavoriteButton({ id, label = "Добавить в избранное" }) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    try { setFavorite(JSON.parse(localStorage.getItem(KEY) || "[]").includes(String(id))); } catch { /* storage unavailable */ }
  }, [id]);
  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const current = JSON.parse(localStorage.getItem(KEY) || "[]").map(String);
      const next = favorite ? current.filter((item) => item !== String(id)) : [...current, String(id)];
      localStorage.setItem(KEY, JSON.stringify(next));
      setFavorite(!favorite);
    } catch { /* storage unavailable */ }
  };
  return <button type="button" onClick={toggle} aria-label={favorite ? "Удалить из избранного" : label} aria-pressed={favorite} className={cn("rounded-md p-1.5 transition-colors", favorite ? "text-amber-300" : "text-mute hover:text-amber-300")}><Star className="h-4 w-4" fill={favorite ? "currentColor" : "none"} /></button>;
}
