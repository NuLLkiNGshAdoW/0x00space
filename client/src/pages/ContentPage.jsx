import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Mail,
  ShieldCheck,
  Map,
  Users,
  ArrowUpRight,
  House,
  Orbit,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import Seo from "../components/Seo.jsx";
import { absoluteUrl, breadcrumbSchema, SITE_NAME } from "../lib/seo.js";

const PAGES = {
  "/about": {
    title: "О канале 0x00 SPACE",
    description: "Игровое сообщество о Minecraft, кооперативных играх и хоррорах.",
    icon: Users,
    items: [
      ["Что мы снимаем", "Выживание, кооперативные прохождения, хорроры, челленджи и инди-игры."],
      [
        "Для кого канал",
        "Для игроков, которые любят атмосферные ролики и хотят играть вместе с сообществом.",
      ],
      [
        "Что можно найти на сайте",
        "Видео, сиды, моды, гайды и возможность подать заявку на совместный ивент.",
      ],
    ],
  },
  "/faq": {
    title: "Частые вопросы",
    description: "Ответы о видео, материалах Minecraft и участии в игровых событиях 0x00 SPACE.",
    icon: BookOpen,
    items: [
      ["Как попасть в ролик?", "Заполните заявку на главной странице и оставьте рабочий контакт."],
      [
        "Где смотреть новые видео?",
        "На странице «Видео» публикуются последние ролики и Shorts с YouTube-канала.",
      ],
      [
        "Где скачать материалы?",
        "Откройте страницу «Материалы», воспользуйтесь поиском и фильтрами.",
      ],
    ],
  },
  "/guides": {
    title: "Гайды по Minecraft и кооперативным играм",
    description: "Инструкции по модам, шейдерам, Minecraft и совместным играм.",
    icon: BookOpen,
    items: [
      [
        "Как установить моды и шейдеры в Minecraft",
        "Проверяйте совместимость версии игры, используйте загрузчик Fabric или Forge и делайте резервную копию мира.",
      ],
      [
        "Как выбрать сид для нового выживания",
        "Смотрите версию Minecraft, координаты интересных мест и всегда создавайте тестовый мир перед основной игрой.",
      ],
      [
        "Как подготовиться к кооперативному хоррору",
        "Проверьте микрофон, договоритесь о голосовом чате и не открывайте подозрительные ссылки из непроверенных источников.",
      ],
    ],
  },
  "/seeds": {
    title: "Сиды Minecraft и координаты",
    description: "Интересные миры и сиды Minecraft для выживания, строительства и игры с друзьями.",
    icon: Map,
    items: [
      [
        "Сиды из новых роликов",
        "Актуальные сиды и скриншоты находятся в разделе материалов на главной странице.",
      ],
      [
        "Как использовать сид",
        "При создании мира откройте дополнительные настройки и вставьте код сида без лишних пробелов.",
      ],
      [
        "Проверяйте версию",
        "Один и тот же сид может создавать разные структуры в разных версиях Minecraft.",
      ],
    ],
  },
  "/events": {
    title: "Игровые ивенты 0x00 SPACE",
    description: "Совместные прохождения, челленджи и игровые записи с участниками сообщества.",
    icon: CalendarDays,
    items: [
      [
        "Как принять участие",
        "Заполните заявку на главной странице, укажите игру и удобный способ связи.",
      ],
      [
        "Что требуется",
        "Рабочий микрофон, подходящая игра и готовность соблюдать правила общения в команде. Требования к конкретной записи обсуждаются отдельно.",
      ],
      [
        "Как узнают участники",
        "Мы связываемся с выбранными участниками по указанному контакту перед записью.",
      ],
    ],
  },
  "/contacts": {
    title: "Контакты 0x00 SPACE",
    description: "Свяжитесь с 0x00 SPACE, предложите идею или отправьте заявку на участие.",
    icon: Mail,
    items: [
      [
        "Заявка на участие",
        "Используйте форму на главной странице — так заявка сразу попадёт в нужную очередь.",
      ],
      [
        "Социальные сети",
        "Актуальные ссылки на YouTube, Telegram, Discord и VK находятся в шапке и подвале сайта.",
      ],
      [
        "Предложение для ролика",
        "Опишите идею в заявке или напишите в официальные сообщения сообщества.",
      ],
    ],
  },
  "/privacy": {
    title: "Политика конфиденциальности",
    description: "Как 0x00 SPACE использует данные, переданные через форму участия.",
    icon: ShieldCheck,
    items: [
      [
        "Какие данные собираются",
        "Ник, возраст, контакт, выбранная игра и текст идеи — только для обработки заявки.",
      ],
      [
        "Как используются данные",
        "Данные нужны для связи с участником и организации игровых записей. Мы не продаём их третьим лицам.",
      ],
      [
        "Удаление данных",
        "Для удаления заявки обратитесь через официальные контакты канала, указав ник и контакт из заявки.",
      ],
    ],
  },
};

export default function ContentPage({ path }) {
  const page = PAGES[path];
  const Icon = page?.icon;
  const structuredData = page
    ? [
        breadcrumbSchema([
          { name: "Главная", path: "/" },
          { name: page.title, path },
        ]),
        path === "/faq"
          ? {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: page.items.map(([question, answer]) => ({
                "@type": "Question",
                name: question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            }
          : {
              "@context": "https://schema.org",
              "@type": path === "/about" ? "AboutPage" : "WebPage",
              name: `${page.title} — ${SITE_NAME}`,
              description: page.description,
              url: absoluteUrl(path),
              inLanguage: "ru-RU",
              isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
            },
      ]
    : undefined;

  return (
    <div className="min-h-screen">
      <Seo
        title={page ? `${page.title} — 0x00 SPACE` : "404 — 0x00 SPACE"}
        description={page?.description || "Страница не найдена."}
        path={path}
        noindex={!page}
        structuredData={structuredData}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-10 sm:py-16">
        {page ? (
          <div className="mx-auto max-w-5xl">
            <nav
              aria-label="Хлебные крошки"
              className="flex items-center gap-1.5 text-xs text-mute"
            >
              <Link to="/" className="transition-colors hover:text-emerald">
                Главная
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-ink">{page.title}</span>
            </nav>

            <article className="content-page-surface mt-6 overflow-hidden rounded-3xl">
              <header className="relative border-b border-line px-5 py-8 sm:px-10 sm:py-12">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald/10 blur-3xl"
                />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel2 text-emerald">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h1 className="mt-5 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                      {page.title}
                    </h1>
                    <p className="content-page-copy mt-4 max-w-xl text-base leading-relaxed">
                      {page.description}
                    </p>
                  </div>
                  <Link to="/" className="button-secondary shrink-0 self-start">
                    <ArrowLeft className="h-4 w-4" />
                    На главную
                  </Link>
                </div>
              </header>

              <div className="grid gap-4 p-5 sm:p-10 md:grid-cols-3">
                {page.items.map(([title, text], index) => (
                  <section
                    key={title}
                    className="content-page-card rounded-2xl p-5 transition-colors hover:border-emerald/30"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mt-3 text-base font-semibold text-ink">{title}</h2>
                    <p className="content-page-copy mt-2 text-sm leading-relaxed">{text}</p>
                  </section>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
                <p className="text-xs text-mute">0x00 SPACE · играем вместе</p>
                <div className="flex flex-wrap gap-2">
                  {path === "/events" && (
                    <Link to="/#application" className="button-primary">
                      Подать заявку
                    </Link>
                  )}
                  <Link to="/videos" className="button-secondary">
                    Смотреть видео
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <div className="content-page-surface relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl border border-line/80 px-6 py-10 shadow-2xl shadow-black/25 sm:px-10 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 -z-10 h-80 w-80 rounded-full bg-violet/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 -z-10 h-96 w-96 rounded-full bg-emerald/10 blur-3xl" />
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr] lg:gap-6">
              <div className="relative z-10">
                <p className="eyebrow inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                  Сигнал потерян · ошибка 404
                </p>
                <h1 className="mt-5 max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
                  Кажется, мы улетели не на ту планету.
                </h1>
                <p className="content-page-copy mt-4 max-w-lg text-sm leading-relaxed sm:text-base">
                  Такой страницы нет в нашей галактике. Проверь адрес или возвращайся к видео и приключениям 0x00 SPACE.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/" className="button-primary">
                    <House className="h-4 w-4" aria-hidden="true" /> На главную
                  </Link>
                  <Link to="/videos" className="button-secondary">
                    Смотреть видео <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to="/search" aria-label="Поиск по сайту" className="icon-button border border-line text-mute hover:text-emerald">
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-8 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                  0x00 SPACE <span className="mx-2 text-line">/</span> возвращаемся на курс
                </p>
              </div>

              <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center" aria-hidden="true">
                <span className="absolute inset-[8%] rounded-full border border-violet/20" />
                <span className="absolute inset-[19%] rounded-full border border-emerald/20" />
                <span className="absolute inset-[30%] rounded-full border border-line/80" />
                <span className="absolute left-[17%] top-[22%] h-2 w-2 rounded-full bg-violet shadow-[0_0_18px_rgba(167,139,250,.9)]" />
                <span className="absolute bottom-[20%] right-[17%] h-1.5 w-1.5 rounded-full bg-emerald shadow-[0_0_16px_rgba(52,211,153,.9)]" />
                <span className="absolute right-[22%] top-[16%] h-1 w-1 rounded-full bg-ink/80" />
                <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-emerald/30 bg-panel/80 shadow-[0_0_80px_-24px_rgba(52,211,153,.5)] backdrop-blur sm:h-44 sm:w-44">
                  <div className="absolute inset-2 rounded-[1.5rem] border border-white/5" />
                  <div className="text-center">
                    <Orbit className="mx-auto h-10 w-10 text-emerald sm:h-12 sm:w-12" strokeWidth={1.3} />
                    <span className="mt-2 block font-mono text-3xl font-semibold tracking-[-0.12em] text-ink sm:text-4xl">404</span>
                  </div>
                </div>
                <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 rounded-full border border-line bg-void/70 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mute">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-violet" /> координаты неизвестны
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}
