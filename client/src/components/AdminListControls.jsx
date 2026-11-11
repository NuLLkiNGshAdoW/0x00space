import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

const ARCHIVE_OPTIONS = [
  ["active", "Активные"],
  ["archived", "Архив"],
  ["all", "Все записи"],
];

export function AdminListFilters({ search, onSearchChange, archive, onArchiveChange }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <label className="relative block">
        <span className="sr-only">Поиск в списке</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск…"
          className="field-control w-full pl-9"
        />
      </label>
      <label className="relative block">
        <span className="sr-only">Фильтр архива</span>
        <select
          value={archive}
          onChange={(event) => onArchiveChange(event.target.value)}
          className="field-control w-full appearance-none pr-9"
        >
          {ARCHIVE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}

export function AdminListPagination({ page, total, hasNext, onPageChange }) {
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Страницы списка">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-mute hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Назад
      </button>
      <span className="text-center font-mono text-[11px] text-mute">
        Страница {page} · {total} записей
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-mute hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        Далее
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
