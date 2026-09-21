import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
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
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    menuRef.current?.querySelector("a")?.focus();
    const onKeyDown = (event) => event.key === "Escape" && closeMenu(true);
    const onPointerDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        event.target !== menuButtonRef.current
      ) {
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen, closeMenu]);

  // Закрываем мобильное меню при переходе по ссылке
  const handleNavClick = closeMenu;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 overflow-x-clip border-b transition-colors",
        isScrolled
          ? "border-line bg-void/95 shadow-lg shadow-black/20 backdrop-blur-xl"
          : "border-line/70 bg-void/80 backdrop-blur-xl",
      )}
    >
      <div className="container-app flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/brand-mark.png"
            alt=""
            width="40"
            height="40"
            className="h-8 w-8 object-contain"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            0x00 <span className="text-emerald">SPACE</span>
          </span>
        </Link>

        <nav
          aria-label="Основная навигация"
          className="hidden min-w-0 md:flex items-center gap-4 lg:gap-8"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === "/"}
              className={({ isActive }) =>
                cn(
                  "text-sm transition-colors hover:text-ink",
                  isActive ? "text-emerald" : "text-mute",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
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

        <Link
          to="/videos"
          className="button-primary hidden min-h-10 px-4 py-2 text-xs lg:inline-flex"
        >
          Смотреть видео
        </Link>

        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="icon-button md:hidden text-ink"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div
          id="mobile-navigation"
          ref={menuRef}
          className="md:hidden border-t border-line bg-panel/95 shadow-2xl backdrop-blur-xl"
        >
          <nav aria-label="Мобильная навигация" className="container-app flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === "/"}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "interactive-control rounded-lg px-3 py-2.5 text-left text-sm hover:bg-panel2",
                    isActive ? "bg-panel2 text-emerald" : "text-ink",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/videos" onClick={handleNavClick} className="button-primary mt-2 w-full">
              Смотреть видео
            </Link>
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
