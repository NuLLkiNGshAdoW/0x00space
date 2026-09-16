import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import LogoMark from "./icons/LogoMark.jsx";
import { SOCIAL_LINKS } from "../lib/socials.js";
import { cn } from "../lib/utils.js";

const NAV_LINKS = [
  { label: "Главная", href: "/" },
  { label: "Видео", href: "/videos" },
  { label: "Материалы", href: "/materials" },
  { label: "О канале", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Ивенты", href: "/events" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Закрываем мобильное меню при переходе по ссылке
  const handleNavClick = () => setIsOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors",
        isScrolled ? "border-line bg-void/85 backdrop-blur-md" : "border-transparent bg-transparent"
      )}
    >
      <div className="container-app flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <LogoMark className="h-8 w-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            0x00 <span className="text-emerald">SPACE</span>
          </span>
        </a>

        <nav aria-label="Основная навигация" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-mute transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1">
          {SOCIAL_LINKS.map(({ name, href, icon: Icon }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={name}
              className="rounded-lg p-2 text-mute transition-colors hover:bg-panel2 hover:text-emerald"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isOpen}
          className="md:hidden rounded-lg p-2 text-ink hover:bg-panel2"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-line bg-void/95 backdrop-blur-md">
            <nav aria-label="Мобильная навигация" className="container-app flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleNavClick}
                className="rounded-lg px-3 py-2.5 text-sm text-ink/90 hover:bg-panel2"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-1 border-t border-line px-3 pt-3">
              {SOCIAL_LINKS.map(({ name, href, icon: Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="rounded-lg p-2 text-mute hover:bg-panel2 hover:text-emerald"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
