import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import {
  deleteAdminResource,
  deleteAdminSeed,
  getAdminResources,
  getAdminSeeds,
  restoreAdminResource,
  restoreAdminSeed,
  saveAdminResource,
  saveAdminSeed,
} from "../services/api.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import useAdminDraft from "../lib/useAdminDraft.js";
import { AdminListFilters, AdminListPagination } from "./AdminListControls.jsx";
import ResourceCard from "./ResourceCard.jsx";
import SeedCard from "./SeedCard.jsx";
import RelatedVideoPicker from "./RelatedVideoPicker.jsx";

const ADMIN_PAGE_SIZE = 8;

const TABS = [
  { id: "resources", label: "Материалы" },
  { id: "seeds", label: "Сиды миров" },
];

const RESOURCE_TYPES = [
  ["texture_pack", "Текстур-пак"],
  ["shader", "Шейдер"],
  ["mod", "Мод"],
  ["modpack", "Сборка"],
  ["guide", "Гайд"],
  ["other", "Другое"],
];

const GAME_CATEGORIES = [
  ["minecraft", "Minecraft"],
  ["coop", "Кооператив"],
  ["horror", "Хоррор"],
  ["other", "Другое"],
];

const EMPTY_RESOURCE = {
  title: "",
  description: "",
  resource_type: "mod",
  game_category: "minecraft",
  game_version: "",
  download_url: "",
  cover_image_url: "",
  related_video_ids: "",
};

const EMPTY_SEED = {
  title: "",
  seed_code: "",
  coordinates: "",
  minecraft_version: "",
  description: "",
  screenshot_url: "",
  related_video_ids: "",
};

export default function AdminCatalog() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("resources");
  const [resourceDraft, setResourceDraft, editingResourceId, setEditingResourceId] = useAdminDraft(
    "0x00space_admin_resource_draft_v1",
    EMPTY_RESOURCE,
  );
  const [seedDraft, setSeedDraft, editingSeedId, setEditingSeedId] = useAdminDraft(
    "0x00space_admin_seed_draft_v1",
    EMPTY_SEED,
  );
  const [previewingResource, setPreviewingResource] = useState(false);
  const [previewingSeed, setPreviewingSeed] = useState(false);
  const [message, setMessage] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceArchive, setResourceArchive] = useState("active");
  const [resourcePage, setResourcePage] = useState(1);
  const [seedSearch, setSeedSearch] = useState("");
  const [seedArchive, setSeedArchive] = useState("active");
  const [seedPage, setSeedPage] = useState(1);
  const debouncedResourceSearch = useDebouncedValue(resourceSearch);
  const debouncedSeedSearch = useDebouncedValue(seedSearch);
  const resourcesQuery = useQuery({
    queryKey: [
      "admin-catalog",
      "resources",
      debouncedResourceSearch,
      resourceArchive,
      resourcePage,
    ],
    queryFn: () =>
      getAdminResources({
        search: debouncedResourceSearch,
        archive: resourceArchive,
        page: resourcePage,
        limit: ADMIN_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const seedsQuery = useQuery({
    queryKey: ["admin-catalog", "seeds", debouncedSeedSearch, seedArchive, seedPage],
    queryFn: () =>
      getAdminSeeds({
        search: debouncedSeedSearch,
        archive: seedArchive,
        page: seedPage,
        limit: ADMIN_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const resourcesPage = resourcesQuery.data || { items: [], has_next: false, total: 0 };
  const seedsPage = seedsQuery.data || { items: [], has_next: false, total: 0 };
  const resources = resourcesPage.items || [];
  const seeds = seedsPage.items || [];

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["resources"] }),
      queryClient.invalidateQueries({ queryKey: ["resource-filters"] }),
      queryClient.invalidateQueries({ queryKey: ["seeds"] }),
    ]);
  };

  const showResourcePreview = (event) => {
    event.preventDefault();
    setMessage("");
    setPreviewingResource(true);
  };

  const saveResource = async () => {
    try {
      await saveAdminResource(
        {
          ...resourceDraft,
          title: resourceDraft.title.trim(),
          description: resourceDraft.description.trim() || null,
          game_version: resourceDraft.game_version.trim() || null,
          download_url: resourceDraft.download_url.trim(),
          cover_image_url: resourceDraft.cover_image_url.trim() || null,
          related_video_ids: parseVideoIds(resourceDraft.related_video_ids),
        },
        editingResourceId,
      );
      setResourceDraft(EMPTY_RESOURCE);
      setEditingResourceId(null);
      setPreviewingResource(false);
      setMessage("Материал сохранён");
      await refreshCatalog();
    } catch (error) {
      setPreviewingResource(false);
      setMessage(error.message);
    }
  };

  const showSeedPreview = (event) => {
    event.preventDefault();
    setMessage("");
    setPreviewingSeed(true);
  };

  const saveSeed = async () => {
    try {
      await saveAdminSeed(
        {
          ...seedDraft,
          title: seedDraft.title.trim(),
          seed_code: seedDraft.seed_code.trim(),
          coordinates: seedDraft.coordinates.trim() || null,
          minecraft_version: seedDraft.minecraft_version.trim(),
          description: seedDraft.description.trim() || null,
          screenshot_url: seedDraft.screenshot_url.trim() || null,
          related_video_ids: parseVideoIds(seedDraft.related_video_ids),
        },
        editingSeedId,
      );
      setSeedDraft(EMPTY_SEED);
      setEditingSeedId(null);
      setPreviewingSeed(false);
      setMessage("Сид сохранён");
      await refreshCatalog();
    } catch (error) {
      setPreviewingSeed(false);
      setMessage(error.message);
    }
  };

  const removeResource = async (resource) => {
    if (!window.confirm(`Переместить материал «${resource.title}» в архив?`)) return;
    try {
      await deleteAdminResource(resource.id);
      setMessage("Материал перемещён в архив");
      await refreshCatalog();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeSeed = async (seed) => {
    if (!window.confirm(`Переместить сид «${seed.title}» в архив?`)) return;
    try {
      await deleteAdminSeed(seed.id);
      setMessage("Сид перемещён в архив");
      await refreshCatalog();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const restoreResource = async (resource) => {
    try {
      await restoreAdminResource(resource.id);
      setMessage("Материал восстановлен");
      await refreshCatalog();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const restoreSeed = async (seed) => {
    try {
      await restoreAdminSeed(seed.id);
      setMessage("Сид восстановлен");
      await refreshCatalog();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="glass mt-10 rounded-2xl p-5 sm:p-7" aria-labelledby="admin-catalog-title">
      <h2 id="admin-catalog-title" className="font-display text-2xl font-semibold text-ink">
        Каталог материалов и сидов
      </h2>
      <p className="mt-2 text-sm text-mute">
        Добавляйте и обновляйте записи. Черновики автоматически сохраняются в этом браузере. Ссылки должны начинаться с http:// или https://.
      </p>

      {previewingResource && (
        <PreviewDialog
          title="Предпросмотр материала"
          editing={Boolean(editingResourceId)}
          message={message}
          onBack={() => setPreviewingResource(false)}
          onPublish={saveResource}
        >
          <ResourceCard resource={{ ...resourceDraft, id: editingResourceId || "preview-resource", related_video_ids: parseVideoIds(resourceDraft.related_video_ids) }} preview />
        </PreviewDialog>
      )}
      {previewingSeed && (
        <PreviewDialog
          title="Предпросмотр сида"
          editing={Boolean(editingSeedId)}
          message={message}
          onBack={() => setPreviewingSeed(false)}
          onPublish={saveSeed}
        >
          <SeedCard seed={{ ...seedDraft, id: editingSeedId || "preview-seed", related_video_ids: parseVideoIds(seedDraft.related_video_ids) }} preview />
        </PreviewDialog>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Управление каталогом">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setMessage("");
              setResourcePage(1);
              setSeedPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm ${
              tab === id
                ? "border-emerald/50 bg-emerald-soft text-emerald"
                : "border-line text-mute hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "resources" ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <form onSubmit={showResourcePreview} className="grid content-start gap-4">
            <h3 className="text-lg font-semibold text-ink">
              {editingResourceId ? "Изменить материал" : "Новый материал"}
            </h3>
            <Field
              label="Название"
              required
              value={resourceDraft.title}
              onChange={(title) => setResourceDraft({ ...resourceDraft, title })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Тип материала"
                value={resourceDraft.resource_type}
                options={RESOURCE_TYPES}
                onChange={(resource_type) => setResourceDraft({ ...resourceDraft, resource_type })}
              />
              <SelectField
                label="Игра / категория"
                value={resourceDraft.game_category}
                options={GAME_CATEGORIES}
                onChange={(game_category) => setResourceDraft({ ...resourceDraft, game_category })}
              />
            </div>
            <Field
              label="Версия игры"
              value={resourceDraft.game_version}
              onChange={(game_version) => setResourceDraft({ ...resourceDraft, game_version })}
              placeholder="Например, 1.21.1"
            />
            <Field
              label="Ссылка для скачивания"
              type="url"
              required
              value={resourceDraft.download_url}
              onChange={(download_url) => setResourceDraft({ ...resourceDraft, download_url })}
              placeholder="https://…"
            />
            <Field
              label="Ссылка на обложку"
              type="url"
              value={resourceDraft.cover_image_url}
              onChange={(cover_image_url) =>
                setResourceDraft({ ...resourceDraft, cover_image_url })
              }
              placeholder="https://…"
            />
          <TextAreaField
            label="Описание"
            value={resourceDraft.description}
            onChange={(description) => setResourceDraft({ ...resourceDraft, description })}
          />
            <RelatedVideoPicker
              value={parseVideoIds(resourceDraft.related_video_ids)}
              onChange={(related_video_ids) => setResourceDraft({ ...resourceDraft, related_video_ids: related_video_ids.join("\n") })}
            />
            <FormActions
              editing={Boolean(editingResourceId)}
              onCancel={() => {
                setResourceDraft(EMPTY_RESOURCE);
                setEditingResourceId(null);
              }}
            />
          </form>
          <RecordList
            title="Материалы"
            loading={resourcesQuery.isPending}
            error={resourcesQuery.error?.message}
            empty="Материалов пока нет."
            items={resources}
            search={resourceSearch}
            onSearchChange={(value) => {
              setResourceSearch(value);
              setResourcePage(1);
            }}
            archive={resourceArchive}
            onArchiveChange={(value) => {
              setResourceArchive(value);
              setResourcePage(1);
            }}
            page={resourcePage}
            total={resourcesPage.total}
            hasNext={resourcesPage.has_next}
            onPageChange={setResourcePage}
            renderSummary={(item) =>
              `${typeLabel(item.resource_type)}${item.game_version ? ` · ${item.game_version}` : ""}`
            }
            onEdit={(item) => {
              setResourceDraft({
                ...EMPTY_RESOURCE,
                ...item,
                description: item.description || "",
                game_version: item.game_version || "",
                cover_image_url: item.cover_image_url || "",
                related_video_ids: (item.related_video_ids || []).join("\n"),
              });
              setEditingResourceId(item.id);
            }}
            onDelete={removeResource}
            onRestore={restoreResource}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <form onSubmit={showSeedPreview} className="grid content-start gap-4">
            <h3 className="text-lg font-semibold text-ink">
              {editingSeedId ? "Изменить сид" : "Новый сид"}
            </h3>
            <Field
              label="Название"
              required
              value={seedDraft.title}
              onChange={(title) => setSeedDraft({ ...seedDraft, title })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Код сида"
                required
                value={seedDraft.seed_code}
                onChange={(seed_code) => setSeedDraft({ ...seedDraft, seed_code })}
              />
              <Field
                label="Версия Minecraft"
                required
                value={seedDraft.minecraft_version}
                onChange={(minecraft_version) => setSeedDraft({ ...seedDraft, minecraft_version })}
                placeholder="Например, 1.21.1"
              />
            </div>
            <Field
              label="Координаты"
              value={seedDraft.coordinates}
              onChange={(coordinates) => setSeedDraft({ ...seedDraft, coordinates })}
              placeholder="X: 120, Z: -340"
            />
            <Field
              label="Ссылка на скриншот"
              type="url"
              value={seedDraft.screenshot_url}
              onChange={(screenshot_url) => setSeedDraft({ ...seedDraft, screenshot_url })}
              placeholder="https://…"
            />
            <TextAreaField
              label="Описание"
              value={seedDraft.description}
              onChange={(description) => setSeedDraft({ ...seedDraft, description })}
            />
            <RelatedVideoPicker
              value={parseVideoIds(seedDraft.related_video_ids)}
              onChange={(related_video_ids) => setSeedDraft({ ...seedDraft, related_video_ids: related_video_ids.join("\n") })}
            />
            <FormActions
              editing={Boolean(editingSeedId)}
              onCancel={() => {
                setSeedDraft(EMPTY_SEED);
                setEditingSeedId(null);
              }}
            />
          </form>
          <RecordList
            title="Сиды миров"
            loading={seedsQuery.isPending}
            error={seedsQuery.error?.message}
            empty="Сидов пока нет."
            items={seeds}
            search={seedSearch}
            onSearchChange={(value) => {
              setSeedSearch(value);
              setSeedPage(1);
            }}
            archive={seedArchive}
            onArchiveChange={(value) => {
              setSeedArchive(value);
              setSeedPage(1);
            }}
            page={seedPage}
            total={seedsPage.total}
            hasNext={seedsPage.has_next}
            onPageChange={setSeedPage}
            renderSummary={(item) => `Minecraft ${item.minecraft_version} · сид ${item.seed_code}`}
            onEdit={(item) => {
              setSeedDraft({
                ...EMPTY_SEED,
                ...item,
                coordinates: item.coordinates || "",
                description: item.description || "",
                screenshot_url: item.screenshot_url || "",
                related_video_ids: (item.related_video_ids || []).join("\n"),
              });
              setEditingSeedId(item.id);
            }}
            onDelete={removeSeed}
            onRestore={restoreSeed}
          />
        </div>
      )}

      {message && (
        <p role="status" className="mt-5 text-sm text-emerald">
          {message}
        </p>
      )}
    </section>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <label className="grid gap-1.5 text-sm text-ink">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink placeholder:text-mute"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5 text-sm text-ink">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="grid gap-1.5 text-sm text-ink">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink"
      />
    </label>
  );
}

function FormActions({ editing, onCancel }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" className="button-primary">
        <Plus className="h-4 w-4" />
        Предпросмотр
      </button>
      {editing && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-ink"
        >
          Отмена
        </button>
      )}
    </div>
  );
}

function PreviewDialog({ title, editing, message, onBack, onPublish, children }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass max-h-full w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-7">
        <h3 className="mb-4 font-display text-xl font-semibold text-ink">{title}</h3>
        {children}
        {message && (
          <p role="alert" className="mt-3 text-sm text-violet">
            {message}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-ink"
          >
            Вернуться к редактированию
          </button>
          <button type="button" onClick={onPublish} className="button-primary">
            {editing ? "Сохранить изменения" : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordList({
  title,
  loading,
  error,
  empty,
  items,
  search,
  onSearchChange,
  archive,
  onArchiveChange,
  page,
  total,
  hasNext,
  onPageChange,
  renderSummary,
  onEdit,
  onDelete,
  onRestore,
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-ink">
        {title} ({total})
      </h3>
      <AdminListFilters
        search={search}
        onSearchChange={onSearchChange}
        archive={archive}
        onArchiveChange={onArchiveChange}
      />
      {loading && <p className="mt-3 text-sm text-mute">Загрузка каталога…</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-violet">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="mt-3 text-sm text-mute">{empty}</p>
      )}
      <ul className="mt-3 grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-void/35 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{item.title}</p>
              <p className="mt-1 truncate text-xs text-mute">
                {item.archived_at && <span className="text-amber">В архиве · </span>}
                {renderSummary(item)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {item.archived_at ? (
                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  aria-label={`Восстановить: ${item.title}`}
                  className="rounded-lg border border-line p-2 text-mute hover:text-emerald"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Изменить: ${item.title}`}
                    className="rounded-lg border border-line p-2 text-mute hover:text-emerald"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
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
      {!loading && !error && (page > 1 || total > ADMIN_PAGE_SIZE) && (
        <AdminListPagination
          page={page}
          total={total}
          hasNext={hasNext}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function typeLabel(key) {
  return RESOURCE_TYPES.find(([value]) => value === key)?.[1] || "Материал";
}

function parseVideoIds(value) {
  return [...new Set(String(value || "").split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];
}
