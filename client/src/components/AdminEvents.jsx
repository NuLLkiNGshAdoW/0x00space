import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import {
  deleteAdminEvent,
  getAdminEvents,
  restoreAdminEvent,
  saveAdminEvent,
} from "../services/api.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import useAdminDraft from "../lib/useAdminDraft.js";
import { AdminListFilters, AdminListPagination } from "./AdminListControls.jsx";
import AdminDialog from "./AdminDialog.jsx";
import { EventCard as PublicEventCard } from "../pages/EventsPage.jsx";

const ADMIN_PAGE_SIZE = 8;

const STATUSES = [
  ["planned", "Планируется"],
  ["registration_open", "Регистрация открыта"],
  ["completed", "Завершено"],
];

const EMPTY_EVENT = {
  title: "",
  description: "",
  game: "",
  starts_at: "",
  image_url: "",
  max_participants: "",
  status: "planned",
  registration_url: "",
};

export default function AdminEvents() {
  const queryClient = useQueryClient();
  const [draft, setDraft, editingId, setEditingId] = useAdminDraft(
    "0x00space_admin_event_draft_v1",
    EMPTY_EVENT,
  );
  const [message, setMessage] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [search, setSearch] = useState("");
  const [archive, setArchive] = useState("active");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const eventsQuery = useQuery({
    queryKey: ["admin-catalog", "events", debouncedSearch, archive, page],
    queryFn: () =>
      getAdminEvents({ search: debouncedSearch, archive, page, limit: ADMIN_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const eventsPage = eventsQuery.data || { items: [], has_next: false, total: 0 };
  const events = eventsPage.items || [];

  const refreshEvents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-catalog", "events"] }),
      queryClient.invalidateQueries({ queryKey: ["events"] }),
    ]);
  };

  const showPreview = (event) => {
    event.preventDefault();
    setMessage("");
    setPreviewing(true);
  };

  const save = async () => {
    try {
      await saveAdminEvent(
        {
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim(),
          game: draft.game.trim(),
          starts_at: draft.starts_at,
          image_url: draft.image_url.trim() || null,
          max_participants: draft.max_participants ? Number(draft.max_participants) : null,
          registration_url: draft.registration_url.trim() || null,
        },
        editingId,
      );
      setDraft(EMPTY_EVENT);
      setEditingId(null);
      setPreviewing(false);
      setMessage("Событие сохранено");
      await refreshEvents();
    } catch (error) {
      setPreviewing(false);
      setMessage(error.message);
    }
  };

  const edit = (item) => {
    setDraft({
      ...EMPTY_EVENT,
      ...item,
      starts_at: String(item.starts_at || "").slice(0, 16),
      image_url: item.image_url || "",
      max_participants: item.max_participants ? String(item.max_participants) : "",
      registration_url: item.registration_url || "",
    });
    setEditingId(item.id);
    setMessage("");
  };

  const remove = async (item) => {
    if (!window.confirm(`Переместить событие «${item.title}» в архив?`)) return;
    try {
      await deleteAdminEvent(item.id);
      setMessage("Событие перемещено в архив");
      await refreshEvents();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const restore = async (item) => {
    try {
      await restoreAdminEvent(item.id);
      setMessage("Событие восстановлено");
      await refreshEvents();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section id="admin-events" className="glass mt-8 scroll-mt-28 rounded-2xl p-5 sm:p-7" aria-labelledby="admin-events-title">
      <h2 id="admin-events-title" className="font-display text-2xl font-semibold text-ink">
        Игровые события
      </h2>
      <p className="mt-2 text-sm text-mute">
        Создавайте события и меняйте статус регистрации. Черновик автоматически сохраняется в этом браузере. Время указывается в часовом поясе админки.
      </p>

      {previewing && (
        <AdminDialog title="Предпросмотр события" onClose={() => setPreviewing(false)}>
            <PublicEventCard event={{ ...draft, id: editingId || "preview-event" }} />
            {message && (
              <p role="alert" className="mt-3 text-sm text-violet">
                {message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewing(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-ink"
              >
                Вернуться к редактированию
              </button>
              <button type="button" onClick={save} className="button-primary">
                {editingId ? "Сохранить изменения" : "Опубликовать"}
              </button>
            </div>
        </AdminDialog>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form id="admin-new-event" onSubmit={showPreview} className="grid scroll-mt-28 content-start gap-4">
          <h3 className="text-lg font-semibold text-ink">
            {editingId ? "Изменить событие" : "Новое событие"}
          </h3>
          <EventField
            label="Название"
            required
            value={draft.title}
            onChange={(title) => setDraft({ ...draft, title })}
          />
          <EventField
            label="Игра"
            required
            value={draft.game}
            onChange={(game) => setDraft({ ...draft, game })}
            placeholder="Например, Minecraft"
          />
          <EventField
            label="Дата и время"
            type="datetime-local"
            required
            value={draft.starts_at}
            onChange={(starts_at) => setDraft({ ...draft, starts_at })}
          />
          <label className="grid gap-1.5 text-sm text-ink">
            Описание
            <textarea
              required
              minLength={2}
              maxLength={4000}
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="w-full resize-y rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-ink">
              Статус
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                className="w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink"
              >
                {STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <EventField
              label="Лимит участников"
              type="number"
              min="1"
              max="10000"
              value={draft.max_participants}
              onChange={(max_participants) => setDraft({ ...draft, max_participants })}
            />
          </div>
          <EventField
            label="Ссылка на обложку"
            type="url"
            value={draft.image_url}
            onChange={(image_url) => setDraft({ ...draft, image_url })}
            placeholder="https://…"
          />
          <EventField
            label="Ссылка для регистрации"
            type="url"
            value={draft.registration_url}
            onChange={(registration_url) => setDraft({ ...draft, registration_url })}
            placeholder="https://…"
          />
          <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 -mx-2 flex flex-wrap gap-2 rounded-2xl border border-line bg-void/95 p-2 shadow-xl backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <button type="submit" className="button-primary">
              <Plus className="h-4 w-4" />
              Предпросмотр события
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY_EVENT);
                  setEditingId(null);
                }}
                className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-ink"
              >
                Отмена
              </button>
            )}
          </div>
        </form>

        <div>
          <h3 className="text-lg font-semibold text-ink">Список событий ({eventsPage.total})</h3>
          <AdminListFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            archive={archive}
            onArchiveChange={(value) => {
              setArchive(value);
              setPage(1);
            }}
          />
          {eventsQuery.isPending && <p className="mt-3 text-sm text-mute">Загрузка событий…</p>}
          {eventsQuery.error && (
            <p role="alert" className="mt-3 text-sm text-violet">
              {eventsQuery.error.message}
            </p>
          )}
          {!eventsQuery.isPending && !eventsQuery.error && events.length === 0 && (
            <p className="mt-3 text-sm text-mute">Событий пока нет.</p>
          )}
          <ul className="mt-3 grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
            {events.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-void/35 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-mute">
                    {item.archived_at && <span className="text-amber">В архиве · </span>}
                    {item.game} ·{" "}
                    {STATUSES.find(([value]) => value === item.status)?.[1] || item.status} · заявок {item.application_count || 0}{item.max_participants ? `/${item.max_participants}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.archived_at ? (
                    <button
                      type="button"
                      onClick={() => restore(item)}
                      aria-label={`Восстановить: ${item.title}`}
                      className="rounded-lg border border-line p-2 text-mute hover:text-emerald"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => edit(item)}
                        aria-label={`Изменить: ${item.title}`}
                        className="rounded-lg border border-line p-2 text-mute hover:text-emerald"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        aria-label={`В архив: ${item.title}`}
                        className="rounded-lg border border-line p-2 text-mute hover:text-violet"
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!eventsQuery.isPending &&
            !eventsQuery.error &&
            (page > 1 || eventsPage.total > ADMIN_PAGE_SIZE) && (
              <AdminListPagination
                page={page}
                total={eventsPage.total}
                hasNext={eventsPage.has_next}
                onPageChange={setPage}
              />
            )}
        </div>
      </div>

      {message && (
        <p role="status" className="mt-5 text-sm text-emerald">
          {message}
        </p>
      )}
    </section>
  );
}

function EventField({ label, value, onChange, type = "text", required = false, ...attributes }) {
  return (
    <label className="grid gap-1.5 text-sm text-ink">
      {label}
      <input
        {...attributes}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink placeholder:text-mute"
      />
    </label>
  );
}
