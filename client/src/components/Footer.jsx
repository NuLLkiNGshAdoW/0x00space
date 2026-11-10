import { SOCIAL_LINKS } from "../lib/socials.js";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import BackgroundAnimationToggle from "./BackgroundAnimationToggle.jsx";

const SECTIONS = [
  { label: "Видео", href: "/videos" },
  { label: "Материалы", href: "/materials" },
  { label: "Ивенты", href: "/events" },
  { label: "Гайды", href: "/guides" },
  { label: "О канале", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer aria-label="Подвал сайта" className="border-t border-line/80 bg-void/70">
      <div className="container-app py-12 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:py-14 sm:pb-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.15fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-line bg-panel2">
                <img
                  src="/brand-mark.png"
                  alt=""
                  width="40"
                  height="40"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="font-display text-lg font-semibold text-ink">
                0x00 <span className="text-emerald">SPACE</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
              Игровой портал о Minecraft, кооперативных играх и хоррорах. Смотрим, играем и
              собираемся в одну команду.
            </p>
            <div className="mt-5 flex items-center gap-1">
              {SOCIAL_LINKS.map(({ name, href, icon: Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="icon-button text-mute"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Разделы сайта">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald">
              Разделы
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SECTIONS.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1 text-sm text-mute transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Дополнительные страницы">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet">
              Сообщество
            </h2>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: "Контакты", href: "/contacts" },
                { label: "Политика конфиденциальности", href: "/privacy" },
                { label: "Заявка на ивент", href: "/#application" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1 text-sm text-mute transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
              Настройки
            </h2>
            <div className="mt-4 rounded-xl border border-line bg-panel/50 p-1">
              <BackgroundAnimationToggle />
            </div>
            <Link
              to="/videos"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald transition-colors hover:text-ink"
            >
              Смотреть видео
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-mute sm:flex-row sm:items-center sm:justify-between sm:pr-56">
          <p>© {year} 0x00 SPACE. Все права защищены.</p>
          <p className="font-mono uppercase tracking-[0.18em] text-mute/80">
            Minecraft · Co-op · Horror
          </p>
        </div>
      </div>
    </footer>
  );
}
