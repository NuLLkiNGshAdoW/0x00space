import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Search, X } from "lucide-react";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import { getAdminApplications, updateAdminApplicationStatus } from "../services/api.js";

const PAGE_SIZE = 10;
const STATUS_LABELS = { new: "Новая", approved: "Одобрена", rejected: "Отклонена" };

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const applicationsQuery = useQuery({
    queryKey: ["admin-applications", debouncedSearch, status, page],
    queryFn: () => getAdminApplications({ search: debouncedSearch, status, page, limit: PAGE_SIZE }),
  });
  const mutation = useMutation({
    mutationFn: ({ id, nextStatus }) => updateAdminApplicationStatus(id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-applications"] }),
  });
  const applicationsPage = applicationsQuery.data || { items: [], total: 0, has_next: false };
  const applications = applicationsPage.items || [];

  return (
    <section className="glass mt-8 rounded-2xl p-5 sm:p-7" aria-labelledby="admin-applications-title">
      <h2 id="admin-applications-title" className="font-display text-2xl font-semibold text-ink">
        Заявки участников <span className="font-mono text-base text-mute">({applicationsPage.total})</span>
      </h2>
      <p className="mt-2 text-sm text-mute">Просматривайте заявки и меняйте их статус.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="relative">
          <span className="sr-only">Поиск заявок</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden="true" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ник, контакт, игра или идея" className="field-control w-full pl-9" />
        </label>
        <label>
          <span className="sr-only">Фильтр статуса заявки</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="field-control w-full">
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {applicationsQuery.isPending && <p role="status" className="mt-5 text-sm text-mute">Загрузка заявок…</p>}
      {applicationsQuery.isError && <p role="alert" className="mt-5 text-sm text-violet">{applicationsQuery.error.message}</p>}
      {mutation.isError && <p role="alert" className="mt-4 text-sm text-violet">{mutation.error.message}</p>}
      {applicationsQuery.isSuccess && applications.length === 0 && <p className="mt-6 rounded-xl border border-line bg-void/30 p-6 text-center text-sm text-mute">Заявки не найдены.</p>}

      <ul className="mt-5 grid gap-3">
        {applications.map((application) => <li key={application.id} className="rounded-2xl border border-line bg-void/35 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-semibold text-ink">{application.nickname}</h3>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-mute">
                <span>{application.game}</span><span>{application.age} лет</span><span>{application.contact}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs ${application.status === "new" ? "bg-violet-soft text-violet" : application.status === "approved" ? "bg-emerald-soft text-emerald" : "bg-panel2 text-mute"}`}>
                {STATUS_LABELS[application.status] || application.status}
              </span>
              <time className="inline-flex items-center gap-1 text-[11px] text-mute" dateTime={application.created_at}>
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {new Date(application.created_at).toLocaleDateString("ru-RU")}
              </time>
            </div>
          </div>
          {application.event_title && <p className="mt-3 inline-flex rounded-full border border-violet/30 bg-violet-soft px-2.5 py-1 text-xs text-violet">Ивент: {application.event_title}</p>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-readable">{application.video_idea}</p>
          {application.mic_or_experience_link && <p className="mt-3 break-all text-xs text-mute">Опыт / микрофон: {application.mic_or_experience_link}</p>}
          <p className="mt-3 text-[11px] text-mute">Уведомление в Telegram: {application.telegram_notified ? "отправлено" : "не отправлено"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {application.status !== "approved" && <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: application.id, nextStatus: "approved" })} className="button-primary min-h-9 px-3 py-2 text-xs">
              <Check className="h-4 w-4" /> Одобрить
            </button>}
            {application.status !== "rejected" && <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: application.id, nextStatus: "rejected" })} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-mute hover:border-violet/40 hover:text-violet disabled:opacity-50">
              <X className="h-4 w-4" /> Отклонить
            </button>}
            {application.status !== "new" && <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: application.id, nextStatus: "new" })} className="inline-flex min-h-9 items-center rounded-xl border border-line px-3 py-2 text-xs text-mute hover:text-ink disabled:opacity-50">
              Вернуть в новые
            </button>}
          </div>
        </li>)}
      </ul>

      {!applicationsQuery.isPending && !applicationsQuery.isError && (page > 1 || applicationsPage.has_next) && <nav aria-label="Пагинация заявок" className="mt-5 flex items-center justify-center gap-3">
        <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line px-3 py-2 text-sm text-mute disabled:opacity-40">Назад</button>
        <span className="font-mono text-xs text-mute">Страница {page}</span>
        <button type="button" disabled={!applicationsPage.has_next} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-line px-3 py-2 text-sm text-mute disabled:opacity-40">Далее</button>
      </nav>}
    </section>
  );
}
