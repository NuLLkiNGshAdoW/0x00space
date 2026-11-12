import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ImagePlus,
  LibraryBig,
  MessageSquareText,
  Trash2,
  Video,
} from "lucide-react";
import {
  API_BASE_URL,
  API_ORIGIN,
  BACKGROUNDS_QUERY_KEY,
  BACKGROUNDS_QUERY_OPTIONS,
  checkAdmin,
  getAdminApplications,
  loginAdmin,
  logoutAdmin,
  request as apiRequest,
} from "../services/api.js";
import Seo from "../components/Seo.jsx";
import ApiState from "../components/ApiState.jsx";
import AdminCatalog from "../components/AdminCatalog.jsx";
import AdminEvents from "../components/AdminEvents.jsx";
import AdminApplications from "../components/AdminApplications.jsx";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
const ADMIN_SECTIONS = [
  { id: "admin-backgrounds", label: "Фон сайта", icon: ImagePlus },
  { id: "admin-catalog", label: "Каталог", icon: LibraryBig },
  { id: "admin-events", label: "События", icon: CalendarDays },
  { id: "admin-applications", label: "Заявки", icon: MessageSquareText },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);
  const [settings, setSettings] = useState({
    shade: 0.68,
    blur: 0,
    position: "center",
    speed: 1,
    rotation_minutes: 0,
  });
  const backgroundsQuery = useQuery({
    ...BACKGROUNDS_QUERY_OPTIONS,
    enabled: authenticated,
  });
  const newApplicationsQuery = useQuery({
    queryKey: ["admin-applications", "summary", "new"],
    queryFn: () => getAdminApplications({ status: "new", page: 1, limit: 1 }),
    enabled: authenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    const data = backgroundsQuery.data;
    if (!data) return;
    setItems(data.items || []);
    setActive(data.active);
    setSettings((current) => ({ ...current, ...(data.settings || {}) }));
  }, [backgroundsQuery.data]);

  useEffect(() => {
    checkAdmin()
      .then(() => setAuthenticated(true))
      .catch(() => {})
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const upload = async (event) => {
    event.preventDefault();
    if (!file || !authenticated) return setMessage("Войдите и выберите файл");
    if (!ALLOWED_TYPES.has(file.type))
      return setMessage("Разрешены только JPG, PNG, WebP, MP4 и WebM");
    if (file.size > MAX_FILE_SIZE) return setMessage("Файл слишком большой. Максимум 100 МБ");
    try {
      const form = new FormData();
      form.append("file", file);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/backgrounds/upload`);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable)
            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else
            reject(
              new Error(
                xhr.status === 401 ? "Неверный пароль администратора" : "Не удалось загрузить файл",
              ),
            );
        };
        xhr.onerror = () => reject(new Error("Сервер недоступен"));
        xhr.send(form);
      });
      setFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
      setProgress(null);
      event.target.reset();
      setMessage("Фон загружен");
      await queryClient.invalidateQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
    } catch (error) {
      setProgress(null);
      setMessage(error.message);
    }
  };

  const chooseFile = (selected) => {
    if (!selected) return;
    if (!ALLOWED_TYPES.has(selected.type))
      return setMessage("Разрешены только JPG, PNG, WebP, MP4 и WebM");
    if (selected.size > MAX_FILE_SIZE) return setMessage("Файл слишком большой. Максимум 100 МБ");
    setMessage("");
    setFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(selected);
    });
  };

  const logout = () => {
    logoutAdmin()
      .catch(() => {})
      .finally(() => {
        setAuthenticated(false);
        queryClient.removeQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
        queryClient.removeQueries({ queryKey: ["admin-catalog"] });
      });
    setPassword("");
    setMessage("Сессия завершена");
  };
  const login = async (event) => {
    event.preventDefault();
    try {
      await loginAdmin(password);
      setAuthenticated(true);
      setPassword("");
      setMessage("Вход выполнен");
    } catch (error) {
      setMessage(error.message);
    }
  };
  const activate = async (id) => {
    try {
      await apiRequest(`/backgrounds/${id}/activate`, { method: "POST" });
      setMessage("Активный фон изменён");
      await queryClient.invalidateQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
    } catch (error) {
      setMessage(error.message);
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Удалить этот фон?")) return;
    try {
      await apiRequest(`/backgrounds/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
    } catch (error) {
      setMessage(error.message);
    }
  };
  const saveSettings = async () => {
    try {
      await apiRequest("/backgrounds/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setMessage("Настройки сохранены");
      await queryClient.invalidateQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
    } catch (error) {
      setMessage(error.message);
    }
  };
  const reset = async () => {
    try {
      await apiRequest("/backgrounds/reset", { method: "POST" });
      setMessage("Включён стандартный фон");
      await queryClient.invalidateQueries({ queryKey: BACKGROUNDS_QUERY_KEY });
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (authChecking) {
    return (
      <main className="container-app flex min-h-screen items-center justify-center" role="status">
        <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-mute">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald border-t-transparent" aria-hidden="true" />
          Проверяем доступ…
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main id="main-content" className="container-app flex min-h-screen max-w-2xl flex-col justify-center py-10">
        <Link to="/" className="mb-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-line bg-panel/60 px-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> На сайт
        </Link>
        <section className="glass overflow-hidden rounded-3xl p-6 sm:p-9" aria-labelledby="admin-login-title">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald">0x00 SPACE · ADMIN</p>
          <h1 id="admin-login-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
            Вход в панель управления
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Введите пароль администратора, чтобы управлять контентом и настройками сайта.
          </p>
          <form onSubmit={login} className="mt-7 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-ink">
              Пароль администратора
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="field-control w-full"
                placeholder="Введите пароль"
              />
            </label>
            <button type="submit" className="button-primary min-h-12 w-full">
              Войти в админ-панель
            </button>
          </form>
          {message && <p role="status" className="mt-4 rounded-xl border border-violet/30 bg-violet-soft/40 px-4 py-3 text-sm text-violet">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <Seo
        title="Админ-панель — 0x00 SPACE"
        description="Управление фоновыми материалами 0x00 SPACE."
        path="/admin"
        noindex
      />
      <main id="main-content" className="container-app py-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-panel/60 px-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> На сайт
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 items-center rounded-xl border border-line px-3 text-sm text-mute transition-colors hover:border-violet/40 hover:text-violet"
          >
            Выйти из панели
          </button>
        </header>

        <div className="mt-8 rounded-3xl border border-emerald/15 bg-gradient-to-br from-emerald/10 via-panel/60 to-violet/10 p-5 sm:mt-10 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald">
            0x00 SPACE · ADMIN
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Панель управления
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
            Управляйте оформлением сайта, материалами, событиями и заявками из одного места.
          </p>
        </div>

        <nav
          aria-label="Разделы админ-панели"
          className="sticky top-3 z-30 mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-line/80 bg-void/90 p-2 shadow-xl shadow-black/20 backdrop-blur-xl"
        >
          {ADMIN_SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm text-mute transition-colors hover:bg-panel2 hover:text-emerald focus-visible:text-emerald sm:px-4"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>

        <section className="mt-5 grid gap-3 sm:grid-cols-[minmax(14rem,0.8fr)_2fr]" aria-label="Сводка и быстрые действия">
          <a
            href="#admin-applications"
            className="group flex min-h-28 items-center justify-between gap-4 rounded-2xl border border-violet/25 bg-violet-soft/30 p-4 transition-colors hover:border-violet/50 hover:bg-violet-soft/50 sm:p-5"
            aria-label={`Новые заявки: ${newApplicationsQuery.isPending ? "загрузка" : newApplicationsQuery.data?.total ?? "нет данных"}. Перейти к заявкам`}
          >
            <span>
              <span className="block text-sm font-medium text-ink">Новые заявки</span>
              <span className="mt-1 block text-xs text-mute">Ожидают вашего ответа</span>
            </span>
            <span className="font-display text-3xl font-semibold tabular-nums text-violet" aria-hidden="true">
              {newApplicationsQuery.isPending ? "…" : newApplicationsQuery.data?.total ?? "—"}
            </span>
          </a>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a href="#admin-new-material" className="group flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel/50 px-4 py-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald">
              <LibraryBig className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
              <span><span className="block font-medium text-ink group-hover:text-emerald">Добавить материал</span><span className="mt-0.5 block text-xs">Каталог и сиды</span></span>
            </a>
            <a href="#admin-new-event" className="group flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel/50 px-4 py-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald">
              <CalendarDays className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
              <span><span className="block font-medium text-ink group-hover:text-emerald">Создать событие</span><span className="mt-0.5 block text-xs">Игровые ивенты</span></span>
            </a>
            <a href="#admin-background-upload" className="group flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel/50 px-4 py-3 text-sm text-mute transition-colors hover:border-emerald/40 hover:text-emerald">
              <ImagePlus className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
              <span><span className="block font-medium text-ink group-hover:text-emerald">Сменить фон</span><span className="mt-0.5 block text-xs">Оформление сайта</span></span>
            </a>
          </div>
        </section>

        <section id="admin-backgrounds" aria-labelledby="admin-backgrounds-title" className="scroll-mt-28">
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Оформление</p>
            <h2 id="admin-backgrounds-title" className="mt-2 font-display text-2xl font-semibold text-ink">
              Фон сайта
            </h2>
          </div>
          <span className="rounded-full border border-line bg-panel/60 px-3 py-1.5 text-xs text-mute">
            Изображения и видео · до 100 МБ
          </span>
        </div>
        <form
          id="admin-background-upload"
          onSubmit={upload}
          className="glass mt-5 max-w-2xl scroll-mt-28 rounded-2xl p-5 sm:p-6"
        >
          <label
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-void/30 p-5 text-sm text-mute transition-colors hover:border-emerald/50 hover:bg-emerald/5 sm:p-7"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files?.[0]);
            }}
          >
            <ImagePlus className="h-5 w-5 text-emerald" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{file ? file.name : "Выберите файл или перетащите сюда"}</span>
              <span className="mt-1 block text-xs text-mute">JPG, PNG, WebP, MP4 или WebM · до 100 МБ</span>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                chooseFile(selected);
              }}
              className="sr-only"
            />
          </label>
          {previewUrl &&
            (file?.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                muted
                loop
                className="mt-4 aspect-video w-full rounded-lg object-cover"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Предпросмотр нового фона"
                width="1280"
                height="720"
                className="mt-4 aspect-video w-full rounded-lg object-cover"
              />
            ))}
          <button disabled={progress !== null} className="button-primary mt-5 w-full">
            {progress !== null ? `Загружаем… ${progress}%` : "Загрузить фон"}
          </button>
          {progress !== null && (
            <progress
              className="mt-3 h-2 w-full accent-emerald"
              value={progress}
              max="100"
              aria-label={`Загрузка ${progress}%`}
            />
          )}
          {message && (
            <p role="status" className="mt-4 rounded-xl border border-emerald/20 bg-emerald/5 px-4 py-3 text-sm text-emerald">
              {message}
            </p>
          )}
        </form>
        <section className="glass mt-5 max-w-2xl rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Настройки отображения</h2>
          <label className="mt-5 block text-sm text-ink">
            Затемнение: {Math.round(settings.shade * 100)}%
            <input
              type="range"
              min="0"
              max="0.72"
              step="0.01"
              value={settings.shade}
              onChange={(e) => setSettings({ ...settings, shade: Number(e.target.value) })}
              className="mt-2 w-full accent-emerald"
            />
          </label>
          <label className="mt-4 block text-sm text-ink">
            Размытие: {settings.blur}px
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={settings.blur}
              onChange={(e) => setSettings({ ...settings, blur: Number(e.target.value) })}
              className="mt-2 w-full accent-emerald"
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-ink">
              Позиция
              <select
                value={settings.position}
                onChange={(e) => setSettings({ ...settings, position: e.target.value })}
                className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"
              >
                <option value="center">Центр</option>
                <option value="top">Верх</option>
                <option value="bottom">Низ</option>
              </select>
            </label>
            <label className="text-sm text-ink">
              Скорость видео
              <select
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}
                className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>
            <label className="text-sm text-ink">
              Смена фона
              <select
                value={settings.rotation_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, rotation_minutes: Number(e.target.value) })
                }
                className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"
              >
                <option value="0">Выключена</option>
                <option value="15">Каждые 15 мин</option>
                <option value="60">Каждый час</option>
                <option value="360">Каждые 6 часов</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveSettings}
              className="rounded-lg border border-emerald/40 px-4 py-2.5 text-sm text-emerald hover:bg-emerald-soft"
            >
              Сохранить настройки
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-4 py-2.5 text-sm text-mute hover:text-ink"
            >
              Сбросить к стандартному
            </button>
          </div>
        </section>
        {backgroundsQuery.isPending && <ApiState status="loading" />}
        {backgroundsQuery.isError && (
          <div className="mt-6 max-w-xl">
            <ApiState
              status="error"
              error={backgroundsQuery.error}
              onRetry={backgroundsQuery.refetch}
            />
          </div>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="glass overflow-hidden rounded-xl">
              {item.type === "video" ? (
                <video
                  src={`${API_ORIGIN}${item.url}`}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <img
                  src={`${API_ORIGIN}${item.url}`}
                  alt={item.name}
                  width="1280"
                  height="720"
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{item.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-mute">
                    {item.type === "video" ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <ImagePlus className="h-3 w-3" />
                    )}
                    {item.type}
                  </p>
                </div>
                <div className="flex gap-1">
                  {active?.id === item.id ? (
                    <span className="rounded-md bg-emerald-soft px-2 py-1 text-xs text-emerald">
                      <Check className="inline h-3 w-3" /> Активен
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activate(item.id)}
                      className="rounded-md border border-line px-2 py-1 text-xs text-mute hover:text-emerald"
                    >
                      Выбрать
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label="Удалить фон"
                    className="rounded-md border border-line p-1.5 text-mute hover:text-violet"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </section>
        <AdminCatalog />
        <AdminEvents />
        <AdminApplications />
      </main>
    </div>
  );
}
