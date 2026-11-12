import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { getEvents } from "../services/api.js";

export default function UpcomingEventSection() {
  const { data } = useQuery({
    queryKey: ["events", "home-upcoming"],
    queryFn: async () => {
      const [open, planned] = await Promise.all([
        getEvents({ status: "registration_open", page: 1, limit: 50 }),
        getEvents({ status: "planned", page: 1, limit: 50 }),
      ]);
      return [...(open?.items || []), ...(planned?.items || [])];
    },
    staleTime: 60_000,
  });
  const now = Date.now();
  const event = (data || [])
    .filter((item) => item.status !== "completed" && new Date(item.starts_at).getTime() > now)
    .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at))[0];

  if (!event) return null;
  const registrationUrl = getHttpUrl(event.registration_url);
  const applicationCount = event.application_count || 0;
  const capacityFull = !registrationUrl && event.max_participants != null && applicationCount >= event.max_participants;
  const startsAt = new Date(event.starts_at);

  return (
    <section className="container-app py-10 sm:py-14" aria-labelledby="upcoming-event-title">
      <article className="relative isolate overflow-hidden rounded-3xl border border-emerald/20 bg-panel/75 p-5 shadow-2xl shadow-emerald/5 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-emerald/10 blur-3xl" />
        {event.image_url && <img src={event.image_url} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-15" />}
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow inline-flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Ближайший ивент
            </p>
            <h2 id="upcoming-event-title" className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {event.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-readable">{event.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mute">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald" aria-hidden="true" />
                {startsAt.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <span>{event.game}</span>
              {event.status === "registration_open" && !registrationUrl && <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet" aria-hidden="true" />
                Заявки: {applicationCount}{event.max_participants ? ` / ${event.max_participants}` : ""}
              </span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:min-w-56 lg:flex-col">
            {registrationUrl ? <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="button-primary w-full">
              Зарегистрироваться <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a> : event.status === "registration_open" && !capacityFull ? <Link to={`/?event_id=${encodeURIComponent(event.id)}#application`} className="button-primary w-full">
              Подать заявку <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link> : capacityFull ? <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-panel/50 px-4 text-xs text-mute">Все места заняты</span> : <Link to="/events" className="button-primary w-full">
              Смотреть ивент <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>}
            <Link to="/events" className="text-center text-xs text-mute transition-colors hover:text-emerald">Все события</Link>
          </div>
        </div>
      </article>
    </section>
  );
}

function getHttpUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
