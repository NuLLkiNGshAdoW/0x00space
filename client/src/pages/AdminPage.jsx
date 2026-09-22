import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ImagePlus, Trash2, Video } from "lucide-react";
import {
  API_BASE_URL,
  API_ORIGIN,
  BACKGROUNDS_QUERY_KEY,
  BACKGROUNDS_QUERY_OPTIONS,
  checkAdmin,
  loginAdmin,
  logoutAdmin,
  request as apiRequest,
} from "../services/api.js";
import Seo from "../components/Seo.jsx";
import ApiState from "../components/ApiState.jsx";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
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
      .catch(() => {});
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

  return (
    <div className="min-h-screen">
      <Seo
        title="Админ-панель — 0x00 SPACE"
        description="Управление фоновыми материалами 0x00 SPACE."
        path="/admin"
        noindex
      />
      <main id="main-content" className="container-app py-12 sm:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-emerald"
        >
          <ArrowLeft className="h-4 w-4" /> На сайт
        </Link>
        <h1 className="mt-10 font-display text-3xl font-semibold text-ink">Управление фоном</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Загрузите изображение или живые обои MP4/WebM. Максимальный размер файла — 100 МБ.
        </p>
        <form
          onSubmit={authenticated ? upload : login}
          className="glass mt-8 max-w-xl rounded-2xl p-5"
        >
          <label className="block text-sm text-ink">
            Пароль администратора
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink"
              placeholder="Пароль из ADMIN_PASSWORD в Render"
            />
          </label>
          <label
            className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line p-4 text-sm text-mute hover:border-emerald/50"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files?.[0]);
            }}
          >
            <ImagePlus className="h-5 w-5 text-emerald" />
            <span>{file ? file.name : "Выбрать JPG, PNG, WebP, MP4 или WebM"}</span>
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
            {authenticated ? "Загрузить фон" : "Войти"}
          </button>
          {progress !== null && (
            <progress
              className="mt-3 h-2 w-full accent-emerald"
              value={progress}
              max="100"
              aria-label={`Загрузка ${progress}%`}
            />
          )}
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-line py-2 text-sm text-mute hover:text-ink"
          >
            Выйти и очистить пароль
          </button>
          {message && (
            <p role="status" className="mt-4 text-sm text-emerald">
              {message}
            </p>
          )}
        </form>
        <section className="glass mt-6 max-w-xl rounded-2xl p-5">
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
        {authenticated && backgroundsQuery.isPending && <ApiState status="loading" />}
        {authenticated && backgroundsQuery.isError && (
          <div className="mt-6 max-w-xl">
            <ApiState
              status="error"
              error={backgroundsQuery.error}
              onRetry={backgroundsQuery.refetch}
            />
          </div>
        )}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </main>
    </div>
  );
}
