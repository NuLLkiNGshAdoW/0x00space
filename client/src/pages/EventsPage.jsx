import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronRight, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import Seo from "../components/Seo.jsx";
import { getEvents, getEventGames } from "../services/api.js";
import { cn } from "../lib/utils.js";
import ApiState from "../components/ApiState.jsx";
import { absoluteUrl, breadcrumbSchema, organizationRef } from "../lib/seo.js";

const STATUS_LABELS = {
  planned: "Планируется",
  registration_open: "Регистрация открыта",
  completed: "Завершено",
};

const STATUS_STYLES = {
  registration_open: "bg-emerald-soft text-emerald",
  planned: "bg-violet-soft text-violet",
  completed: "bg-panel2 text-mute",
};

export default function EventsPage() {
  const [game, setGame] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const {
    data: eventsPage = { items: [], has_next: false },
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["events", game, status, page, pageSize],
    queryFn: () => getEvents({ game, status, page, limit: pageSize }),
    placeholderData: keepPreviousData,
  });
  // Список игр не зависит от выбранных фильтров, иначе после выбора игры
  // в селекте оставалась бы только она одна.
  const { data: games = [] } = useQuery({
    queryKey: ["events", "games"],
    queryFn: getEventGames,
    staleTime: 5 * 60 * 1000,
  });
  const events = useMemo(() => eventsPage.items || [], [eventsPage.items]);
  const structuredData = useMemo(
    () => [
      breadcrumbSchema([
        { name: "Главная", path: "/" },
        { name: "Ивенты", path: "/events" },
      ]),
      ...(events.length
        ? [
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Игровые ивенты 0x00 SPACE",
              itemListElement: events.map((event, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Event",
                  name: event.title,
                  description: event.description,
                  startDate: event.starts_at,
                  eventStatus: "https://schema.org/EventScheduled",
                  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
                  location: {
                    "@type": "VirtualLocation",
                    url: absoluteUrl("/events"),
                  },
                  ...(event.image_url ? { image: absoluteUrl(event.image_url) } : {}),
                  organizer: organizationRef(),
                },
              })),
            },
          ]
        : []),
    ],
    [events],
  );

  return (
    <div className="min-h-screen">
      <Seo
        title="Игровые ивенты — 0x00 SPACE"
        description="Актуальные игровые события 0x00 SPACE: Minecraft, кооп-хорроры и инди-игры."
        path="/events"
        structuredData={structuredData}
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="pt-6 sm:pt-10">
        <div className="container-app">
          <nav aria-label="Хлебные крошки" className="flex items-center gap-1.5 text-xs text-mute">
            <Link to="/" className="transition-colors hover:text-emerald">
              Главная
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-ink">Ивенты</span>
          </nav>

          <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Сообщество</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                Игровые ивенты
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute sm:text-base">
                Реальные события, которые появляются из админ-панели проекта. Выберите игру или
                статус регистрации.
              </p>
            </div>

            <div className="glass rounded-2xl p-4 sm:max-w-xs">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet">
                Хотите участвовать?
              </p>
              <p className="mt-2 text-xs leading-relaxed text-mute">
                Заполните заявку: ник, контакт и игра. Мы свяжемся перед записью.
              </p>
              <Link to="/#application" className="button-primary mt-3 w-full">
                Подать заявку
              </Link>
            </div>
          </div>
        </div>

        <div className="container-app py-10 sm:py-14">
          <div className="flex flex-col gap-3 rounded-2xl border border-line/80 bg-panel/35 p-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="relative block flex-1">
                <span className="sr-only">Фильтр по игре</span>
                <select
                  value={game}
                  onChange={(event) => {
                    setGame(event.target.value);
                    setPage(1);
                  }}
                  className="field-control w-full appearance-none pr-9"
                >
                  <option value="">Все игры</option>
                  {games.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              </label>
              <label className="relative block flex-1">
                <span className="sr-only">Фильтр по статусу</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="field-control w-full appearance-none pr-9"
                >
                  <option value="">Все статусы</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              </label>
            </div>
            <span className="hidden whitespace-nowrap rounded-full border border-line px-3 py-2 font-mono text-[11px] text-mute sm:inline-flex">
              {events.length} событий
            </span>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {isPending && <ApiState status="loading" className="col-span-full" />}
            {isError && (
              <ApiState status="error" error={error} onRetry={refetch} className="col-span-full" />
            )}
            {!isPending && !isError && events.length === 0 && (
              <div className="glass col-span-full rounded-2xl px-6 py-16 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-mute" />
                <p className="mt-3 text-readable">
                  Запланированных событий пока нет. Загляните позже или отправьте заявку на
                  участие.
                </p>
                <Link to="/#application" className="button-primary mt-6">
                  Подать заявку
                </Link>
              </div>
            )}
            {!isPending &&
              !isError &&
              events.map((event) => <EventCard key={event.id} event={event} />)}
            {!isPending &&
              !isError &&
              (events.length > 0 || page > 1) &&
              (page > 1 || eventsPage.has_next) && (
                <nav
                  aria-label="Пагинация событий"
                  className="col-span-full mt-2 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="interactive-control rounded-xl border border-line px-4 py-2 text-xs text-mute transition-colors hover:border-emerald/40 hover:text-emerald disabled:cursor-not-allowed disabled:bg-panel2 disabled:text-mute"
                  >
                    Назад
                  </button>
                  <span className="rounded-lg border border-line bg-panel/50 px-3 py-2 font-mono text-xs text-mute">
                    Страница {page}
                  </span>
                  <button
                    type="button"
                    disabled={!eventsPage.has_next}
                    onClick={() => setPage((current) => current + 1)}
                    className="interactive-control rounded-xl border border-line px-4 py-2 text-xs text-mute transition-colors hover:border-emerald/40 hover:text-emerald disabled:cursor-not-allowed disabled:bg-panel2 disabled:text-mute"
                  >
                    Далее
                  </button>
                </nav>
              )}
          </div>
        </div>
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

function EventCard({ event }) {
  const statusStyle = STATUS_STYLES[event.status] || "bg-panel2 text-mute";

  return (
    <article className="glass glass-hover flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-line/70 bg-panel2">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={`Обложка события: ${event.title}`}
            width="640"
            height="360"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="media-fallback relative flex h-full w-full items-center justify-center overflow-hidden">
            <CalendarDays className="relative z-10 h-10 w-10 text-violet/70" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-void/80 to-transparent" />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
            statusStyle,
          )}
        >
          {STATUS_LABELS[event.status] || event.status}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-void/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink backdrop-blur-sm">
          {event.game}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-xl font-semibold leading-tight text-ink">
          {event.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-readable">
          {event.description}
        </p>
        <div className="mt-auto space-y-2 pt-5 text-xs text-mute">
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-emerald" />
            {new Date(event.starts_at).toLocaleString("ru-RU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          {event.max_participants && (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet" />
              До {event.max_participants} участников
            </span>
          )}
        </div>
        {event.status === "registration_open" ? (
          <Link to="/#application" className="button-primary mt-5 w-full">
            Подать заявку
          </Link>
        ) : (
          <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-panel/40 px-4 text-xs text-mute">
            {event.status === "completed" ? "Событие завершено" : "Регистрация скоро откроется"}
          </span>
        )}
      </div>
    </article>
  );
}
