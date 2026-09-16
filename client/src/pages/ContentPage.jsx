import { ArrowLeft, BookOpen, CalendarDays, Mail, ShieldCheck, Map, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import Seo from "../components/Seo.jsx";

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
    description: "Ответы на главные вопросы о канале, материалах и игровых ивентах.",
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
    description: "Практичные инструкции 0x00 SPACE: моды, шейдеры, выживание и совместная игра.",
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
    description: "Подборка интересных миров для выживания, строительства и совместных приключений.",
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
    description: "Свяжитесь с каналом, предложите идею или задайте вопрос.",
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
    description: "Информация о данных, которые передаются через форму участия.",
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

  return (
    <div className="min-h-screen">
      <Seo
        title={page ? `${page.title} — 0x00 SPACE` : "404 — 0x00 SPACE"}
        description={page?.description || "Страница не найдена."}
        path={path}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-16 sm:py-24">
        {page ? (
          <article className="content-page-surface mx-auto max-w-4xl rounded-3xl p-5 sm:p-10">
            <Link
              to="/"
              className="content-page-copy inline-flex items-center gap-2 text-sm hover:text-emerald"
            >
              <ArrowLeft className="h-4 w-4" /> На главную
            </Link>
            <Icon className="mt-12 h-8 w-8 text-emerald" aria-hidden="true" />
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              {page.title}
            </h1>
            <p className="content-page-copy mt-4 max-w-2xl text-base leading-relaxed">{page.description}</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {page.items.map(([title, text]) => (
                <section key={title} className="content-page-card rounded-xl p-5">
                  <h2 className="text-base font-medium text-ink">{title}</h2>
                  <p className="content-page-copy mt-3 text-sm leading-relaxed">{text}</p>
                </section>
              ))}
            </div>
            {path === "/events" && (
              <Link
                to="/#application"
                 className="button-primary mt-10"
              >
                Подать заявку
              </Link>
            )}
          </article>
        ) : (
          <div className="content-page-surface mx-auto max-w-2xl rounded-3xl p-8 py-20 text-center sm:p-16">
            <p className="font-mono text-6xl text-emerald">404</p>
            <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
              Страница не найдена
            </h1>
            <p className="content-page-copy mt-3">Проверьте адрес или вернитесь на главную.</p>
            <Link
              to="/"
               className="button-primary mt-8"
            >
              На главную
            </Link>
          </div>
        )}
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}
