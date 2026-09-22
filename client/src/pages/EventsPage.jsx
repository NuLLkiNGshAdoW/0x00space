import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProfileBackdrop from "../components/ProfileBackdrop.jsx";
import TelegramFloat from "../components/TelegramFloat.jsx";
import Seo from "../components/Seo.jsx";
import { getEvents } from "../services/api.js";
import { cn } from "../lib/utils.js";
import ApiState from "../components/ApiState.jsx";

const STATUS_LABELS = {
  planned: "Планируется",
  registration_open: "Регистрация открыта",
  completed: "Завершено",
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
  const events = useMemo(() => eventsPage.items || [], [eventsPage.items]);
  const games = useMemo(() => [...new Set(events.map((event) => event.game))].sort(), [events]);

  return (
    <div className="min-h-screen">
      <Seo
        title="Игровые ивенты — 0x00 SPACE"
        description="Актуальные игровые события 0x00 SPACE."
        path="/events"
      />
      <ProfileBackdrop />
      <Navbar />
      <main id="main-content" className="container-app py-12 sm:py-20">
        <Link to="/" className="text-sm text-mute hover:text-emerald">
          ← На главную
        </Link>
        <div className="mt-8 max-w-2xl">
          <p className="section-label">Сообщество</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-5xl">
            Игровые ивенты
          </h1>
          <p className="mt-4 text-base leading-relaxed text-readable">
            Реальные события, которые появляются из админ-панели проекта. Выберите игру или статус
            регистрации.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <label className="max-w-xs flex-1">
            <span className="sr-only">Фильтр по игре</span>
            <select
              value={game}
              onChange={(event) => {
                setGame(event.target.value);
                setPage(1);
              }}
              className="field-control w-full"
            >
              <option value="">Все игры</option>
              {games.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="max-w-xs flex-1">
            <span className="sr-only">Фильтр по статусу</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="field-control w-full"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isPending && <ApiState status="loading" className="col-span-full" />}
          {isError && (
            <ApiState status="error" error={error} onRetry={refetch} className="col-span-full" />
          )}
          {!isPending && !isError && events.length === 0 && (
            <div className="glass col-span-full rounded-2xl px-6 py-16 text-center">
              <CalendarDays className="mx-auto text-mute" />
              <p className="mt-3 text-readable">
                Запланированных событий пока нет. Загляните позже или отправьте заявку на участие.
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
                  className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:cursor-not-allowed disabled:bg-panel2"
                >
                  Назад
                </button>
                <span className="px-2 font-mono text-xs text-mute">Страница {page}</span>
                <button
                  type="button"
                  disabled={!eventsPage.has_next}
                  onClick={() => setPage((current) => current + 1)}
                  className="interactive-control rounded-lg border border-line px-3 py-1.5 text-xs text-mute disabled:cursor-not-allowed disabled:bg-panel2"
                >
                  Далее
                </button>
              </nav>
            )}
        </div>
      </main>
      <TelegramFloat />
      <Footer />
    </div>
  );
}

function EventCard({ event }) {
  return (
    <article className="glass glass-hover flex flex-col overflow-hidden rounded-2xl">
      {event.image_url && (
        <img
          src={event.image_url}
          alt={`Обложка события: ${event.title}`}
          width="640"
          height="360"
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              event.status === "registration_open"
                ? "bg-emerald-soft text-emerald"
                : event.status === "completed"
                  ? "bg-panel2 text-mute"
                  : "bg-violet-soft text-violet",
            )}
          >
            {STATUS_LABELS[event.status] || event.status}
          </span>
          <span className="font-mono text-xs text-mute">{event.game}</span>
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">{event.title}</h2>
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
        {event.status === "registration_open" && (
          <Link to="/#application" className="button-primary mt-5 w-full">
            Подать заявку
          </Link>
        )}
      </div>
    </article>
  );
}
