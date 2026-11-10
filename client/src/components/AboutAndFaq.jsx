import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Gamepad2,
  Map,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const FAQ = [
  [
    "Как попасть на игровой ивент?",
    "Заполните заявку ниже и укажите свой ник, контакт и игру. Мы свяжемся с подходящими участниками.",
  ],
  [
    "В какие игры вы играете?",
    "Основные направления канала — Minecraft, кооперативные игры, хорроры и инди-проекты.",
  ],
  [
    "Где найти моды и сиды из роликов?",
    "Материалы и сиды публикуются в разделе выше. Используйте фильтр по игре и кнопки скачивания или копирования.",
  ],
  [
    "Можно предложить идею для видео?",
    "Да. Напишите идею в форме заявки — лучшие предложения мы добавляем в план будущих роликов.",
  ],
];

const SECTIONS = [
  {
    icon: Map,
    title: "Сиды Minecraft",
    text: "Интересные миры, координаты и версии игры для новых приключений.",
    href: "/seeds",
  },
  {
    icon: BookOpen,
    title: "Моды и шейдеры",
    text: "Подборки материалов, которые помогают сделать выживание красивее.",
    href: "/guides",
  },
  {
    icon: CalendarDays,
    title: "Кооп-хорроры",
    text: "Игры, в которых страшнее всего становится именно вместе с друзьями.",
    href: "/events",
  },
];

export default function AboutAndFaq() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-t border-line py-16 sm:py-20"
    >
      <div className="container-app">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="eyebrow">О канале</p>
            <h2
              id="about-title"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              Играем вместе, а не просто смотрим
            </h2>
            <p className="text-readable mt-3 max-w-xl text-sm leading-relaxed">
              0x00 SPACE — канал о Minecraft, кооперативных играх и хоррорах. На сайте можно
              смотреть публикации канала, открывать доступные материалы и отправлять идеи для
              совместных игр.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/about" className="button-secondary">
                Подробнее о канале
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/contacts" className="button-ghost">
                Контакты
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [Gamepad2, "Разные игры", "От Minecraft до свежих кооперативных проектов."],
              [
                Users,
                "Участие по заявке",
                "Оставьте контакт и идею: команда рассмотрит заявку перед ивентом.",
              ],
              [Sparkles, "Полезный контент", "Гайды, сиды и материалы собраны в одном месте."],
            ].map(([Icon, title, text], index) => (
              <div key={title} className="glass-hover rounded-2xl border border-line bg-panel/50 p-4">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-emerald" aria-hidden="true" />
                  <span className="font-mono text-[10px] text-mute">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
                <p className="text-readable mt-1.5 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-violet">Навигация</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
                Полезные разделы
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {SECTIONS.map(({ icon: Icon, title, text, href }) => (
              <Link
                key={title}
                to={href}
                className="group flex flex-col rounded-2xl border border-line bg-panel/45 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/40 hover:bg-panel2/60"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-void/40 text-emerald">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-mute transition-colors group-hover:text-emerald" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink group-hover:text-emerald">
                  {title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-mute">{text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div id="faq" className="mt-14 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow text-violet">FAQ</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
              Частые вопросы
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">
              Коротко о том, как попасть в ролик, где искать материалы и как предложить идею.
            </p>
            <Link to="/faq" className="link-arrow mt-4">
              Все вопросы
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-line rounded-2xl border border-line bg-panel/50 px-5 shadow-xl shadow-black/10">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="interactive-control flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium text-ink">
                  {question}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-mute transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="text-readable pt-3 text-sm leading-relaxed">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
