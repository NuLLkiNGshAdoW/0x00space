import LogoMark from "./icons/LogoMark.jsx";
import { SOCIAL_LINKS } from "../lib/socials.js";
import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer aria-label="Подвал сайта" className="border-t border-line">
      <div className="container-app flex flex-col items-center gap-5 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6" />
          <span className="font-display text-sm text-ink">
            0x00 <span className="text-emerald">SPACE</span>
          </span>
        </div>

        <p className="text-xs text-mute">© {year} 0x00 SPACE. Все права защищены.</p>

        <nav
          aria-label="Дополнительные страницы"
          className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-mute"
        >
          <Link to="/guides" className="hover:text-emerald">
            Гайды
          </Link>
          <Link to="/events" className="hover:text-emerald">
            Ивенты
          </Link>
          <Link to="/contacts" className="hover:text-emerald">
            Контакты
          </Link>
          <Link to="/privacy" className="hover:text-emerald">
            Конфиденциальность
          </Link>
        </nav>

        <div className="flex items-center gap-1">
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
      </div>
    </footer>
  );
}
