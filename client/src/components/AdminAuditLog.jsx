import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, RefreshCw } from "lucide-react";
import ApiState from "./ApiState.jsx";
import { getAdminAuditLog } from "../services/api.js";

const ENTITY_LABELS = {
  resource: "Материал",
  seed: "Сид",
  event: "Событие",
  application: "Заявка",
};

const ACTION_LABELS = {
  created: "Создано",
  updated: "Изменено",
  archived: "Перемещено в архив",
  restored: "Восстановлено из архива",
  status_changed: "Изменён статус",
};

const FIELD_LABELS = {
  title: "название",
  description: "описание",
  resource_type: "тип материала",
  game_category: "категория игры",
  game_version: "версия игры",
  download_url: "ссылка на скачивание",
  cover_image_url: "обложка",
  related_video_ids: "связанные видео",
  seed_code: "код сида",
  coordinates: "координаты",
  minecraft_version: "версия Minecraft",
  screenshot_url: "скриншот",
  game: "игра",
  starts_at: "дата события",
  image_url: "изображение",
  max_participants: "лимит участников",
  status: "статус",
  registration_url: "ссылка регистрации",
};

const STATUS_LABELS = {
  new: "новая",
  approved: "одобрена",
  rejected: "отклонена",
};

function describeDetails(item) {
  if (item.action === "status_changed") {
    const from = STATUS_LABELS[item.details.from] || item.details.from;
    const to = STATUS_LABELS[item.details.to] || item.details.to;
    return `Статус: ${from} → ${to}`;
  }
  const fields = item.details.fields?.map((field) => FIELD_LABELS[field] || field) || [];
  return fields.length ? `Поля: ${fields.join(", ")}` : "";
}

function formatTimestamp(value) {
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

export default function AdminAuditLog() {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const auditQuery = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => getAdminAuditLog({ page, limit: 20 }),
    enabled: expanded,
  });

  return (
    <section id="admin-audit" aria-labelledby="admin-audit-title" className="scroll-mt-28">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">История изменений</p>
          <h2 id="admin-audit-title" className="mt-2 font-display text-2xl font-semibold text-ink">
            Журнал действий
          </h2>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expanded ? "admin-audit-content" : undefined}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald"
        >
          <History className="h-4 w-4" aria-hidden="true" />
          {expanded ? "Скрыть журнал" : "Показать журнал"}
        </button>
      </div>

      {expanded && (
        <div id="admin-audit-content" className="glass mt-5 rounded-2xl p-4 sm:p-6">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => auditQuery.refetch()}
              disabled={auditQuery.isFetching}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs text-mute hover:text-emerald disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Обновить
            </button>
          </div>
          {auditQuery.isPending && <ApiState status="loading" />}
          {auditQuery.isError && (
            <ApiState status="error" error={auditQuery.error} onRetry={auditQuery.refetch} />
          )}
          {auditQuery.isSuccess && auditQuery.data.items.length === 0 && (
            <p className="text-sm text-mute">Записей пока нет.</p>
          )}
          {auditQuery.isSuccess && auditQuery.data.items.length > 0 && (
            <>
              <ol className="divide-y divide-line">
                {auditQuery.data.items.map((item) => (
                  <li
                    key={item.id}
                    className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {ENTITY_LABELS[item.entity_type] || item.entity_type} ·{" "}
                        {ACTION_LABELS[item.action] || item.action}
                      </p>
                      {describeDetails(item) && (
                        <p className="mt-1 text-xs text-mute">{describeDetails(item)}</p>
                      )}
                      <p className="mt-1 truncate font-mono text-[11px] text-mute/80">
                        ID: {item.entity_id} · Администратор: {item.actor}
                      </p>
                    </div>
                    <time dateTime={item.created_at} className="text-xs tabular-nums text-mute">
                      {formatTimestamp(item.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="text-xs text-mute">
                  Страница {auditQuery.data.page} · записей: {auditQuery.data.total}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || auditQuery.isFetching}
                    className="min-h-9 rounded-lg border border-line px-3 text-xs text-mute disabled:opacity-50"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => value + 1)}
                    disabled={!auditQuery.data.has_next || auditQuery.isFetching}
                    className="min-h-9 rounded-lg border border-line px-3 text-xs text-mute disabled:opacity-50"
                  >
                    Далее
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
