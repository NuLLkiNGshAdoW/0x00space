import { useEffect, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Trash2, Video } from "lucide-react";
import { API_BASE_URL, API_ORIGIN } from "../services/api.js";

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || "");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({ shade: 0.88, blur: 0, position: "center", speed: 1, rotation_minutes: 0 });
  const load = () => fetch(`${API_BASE_URL}/backgrounds`).then((r) => r.json()).then((data) => { setItems(data.items || []); setActive(data.active); setSettings((current) => ({ ...current, ...(data.settings || {}) })); });
  useEffect(() => { load().catch(() => setMessage("Backend недоступен")); }, []);

  const request = async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers: { ...(options.headers || {}), "X-Admin-Token": token } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Операция не выполнена");
    return data;
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file || !token) return setMessage("Введите токен и выберите файл");
    try {
      const form = new FormData(); form.append("file", file);
      await request("/backgrounds/upload", { method: "POST", body: form });
      localStorage.setItem("admin_token", token); setFile(null); setPreviewUrl(""); event.target.reset(); setMessage("Фон загружен"); await load();
    } catch (error) { setMessage(error.message); }
  };
  const activate = async (id) => { try { await request(`/backgrounds/${id}/activate`, { method: "POST" }); setMessage("Активный фон изменён"); await load(); } catch (error) { setMessage(error.message); } };
  const remove = async (id) => { if (!window.confirm("Удалить этот фон?")) return; try { await request(`/backgrounds/${id}`, { method: "DELETE" }); await load(); } catch (error) { setMessage(error.message); } };
  const saveSettings = async () => { try { await request("/backgrounds/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); setMessage("Настройки сохранены"); } catch (error) { setMessage(error.message); } };
  const reset = async () => { try { await request("/backgrounds/reset", { method: "POST" }); setMessage("Включён стандартный фон"); await load(); } catch (error) { setMessage(error.message); } };

  return <div className="min-h-screen"><main id="main-content" className="container-app py-12 sm:py-20">
    <a href="/" className="inline-flex items-center gap-2 text-sm text-mute hover:text-emerald"><ArrowLeft className="h-4 w-4" /> На сайт</a>
    <h1 className="mt-10 font-display text-3xl font-semibold text-ink">Управление фоном</h1>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">Загрузите изображение или живые обои MP4/WebM. Максимальный размер файла — 100 МБ.</p>
    <form onSubmit={upload} className="glass mt-8 max-w-xl rounded-2xl p-5">
      <label className="block text-sm text-ink">Токен администратора<input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2.5 text-ink" placeholder="ADMIN_TOKEN" /></label>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line p-4 text-sm text-mute hover:border-emerald/50"><ImagePlus className="h-5 w-5 text-emerald" /><span>{file ? file.name : "Выбрать JPG, PNG, WebP, MP4 или WebM"}</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { const selected = e.target.files?.[0] || null; setFile(selected); setPreviewUrl(selected ? URL.createObjectURL(selected) : ""); }} className="sr-only" /></label>
      {previewUrl && (file?.type.startsWith("video/") ? <video src={previewUrl} controls muted loop className="mt-4 aspect-video w-full rounded-lg object-cover" /> : <img src={previewUrl} alt="Предпросмотр нового фона" className="mt-4 aspect-video w-full rounded-lg object-cover" />)}
      <button className="mt-5 w-full rounded-lg bg-emerald py-3 text-sm font-semibold text-void">Загрузить фон</button>
      {message && <p role="status" className="mt-4 text-sm text-emerald">{message}</p>}
    </form>
    <section className="glass mt-6 max-w-xl rounded-2xl p-5">
      <h2 className="font-display text-lg font-semibold text-ink">Настройки отображения</h2>
      <label className="mt-5 block text-sm text-ink">Затемнение: {Math.round(settings.shade * 100)}%<input type="range" min="0" max="0.98" step="0.01" value={settings.shade} onChange={(e) => setSettings({ ...settings, shade: Number(e.target.value) })} className="mt-2 w-full accent-emerald" /></label>
      <label className="mt-4 block text-sm text-ink">Размытие: {settings.blur}px<input type="range" min="0" max="20" step="1" value={settings.blur} onChange={(e) => setSettings({ ...settings, blur: Number(e.target.value) })} className="mt-2 w-full accent-emerald" /></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm text-ink">Позиция<select value={settings.position} onChange={(e) => setSettings({ ...settings, position: e.target.value })} className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"><option value="center">Центр</option><option value="top">Верх</option><option value="bottom">Низ</option></select></label><label className="text-sm text-ink">Скорость видео<select value={settings.speed} onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })} className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label className="text-sm text-ink">Смена фона<select value={settings.rotation_minutes} onChange={(e) => setSettings({ ...settings, rotation_minutes: Number(e.target.value) })} className="mt-2 w-full rounded-lg border border-line bg-void/60 px-3 py-2 text-ink"><option value="0">Выключена</option><option value="15">Каждые 15 мин</option><option value="60">Каждый час</option><option value="360">Каждые 6 часов</option></select></label></div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={saveSettings} className="rounded-lg border border-emerald/40 px-4 py-2.5 text-sm text-emerald hover:bg-emerald-soft">Сохранить настройки</button><button type="button" onClick={reset} className="rounded-lg border border-line px-4 py-2.5 text-sm text-mute hover:text-ink">Сбросить к стандартному</button></div>
    </section>
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => <article key={item.id} className="glass overflow-hidden rounded-xl">
        {item.type === "video" ? <video src={`${API_ORIGIN}${item.url}`} muted loop autoPlay playsInline className="aspect-video w-full object-cover" /> : <img src={`${API_ORIGIN}${item.url}`} alt={item.name} className="aspect-video w-full object-cover" />}
        <div className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm text-ink">{item.name}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-mute">{item.type === "video" ? <Video className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}{item.type}</p></div><div className="flex gap-1">{active?.id === item.id ? <span className="rounded-md bg-emerald-soft px-2 py-1 text-xs text-emerald"><Check className="inline h-3 w-3" /> Активен</span> : <button type="button" onClick={() => activate(item.id)} className="rounded-md border border-line px-2 py-1 text-xs text-mute hover:text-emerald">Выбрать</button>}<button type="button" onClick={() => remove(item.id)} aria-label="Удалить фон" className="rounded-md border border-line p-1.5 text-mute hover:text-violet"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
      </article>)}
    </div>
  </main></div>;
}
