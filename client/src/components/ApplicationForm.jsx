import { useState } from "react";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { submitApplication, ApiError } from "../services/api.js";
import { cn } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";

const GAME_OPTIONS = ["Minecraft", "Phasmophobia", "Lethal Company", "Другая игра"];

const INITIAL_FORM = {
  nickname: "",
  contact: "",
  game: GAME_OPTIONS[0],
  customGame: "",
  age: "",
  micOrExperience: "",
  videoIdea: "",
};

function validate(form) {
  const errors = {};

  if (form.nickname.trim().length < 2) {
    errors.nickname = "Укажите ник или имя — минимум 2 символа";
  }
  if (form.contact.trim().length < 2) {
    errors.contact = "Укажите Discord или Telegram для связи";
  }
  if (form.game === "Другая игра" && form.customGame.trim().length < 2) {
    errors.customGame = "Напишите, в какую игру хотите поиграть";
  }
  const age = Number(form.age);
  if (!form.age || Number.isNaN(age) || age < 6 || age > 100) {
    errors.age = "Возраст от 6 до 100 лет";
  }
  if (form.videoIdea.trim().length < 5) {
    errors.videoIdea = "Опишите идею подробнее — хотя бы несколько слов";
  }

  return errors;
}

export default function ApplicationForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [serverError, setServerError] = useState("");

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    setServerError("");

    try {
      await submitApplication({
        nickname: form.nickname.trim(),
        age: Number(form.age),
        contact: form.contact.trim(),
        game: form.game === "Другая игра" ? form.customGame.trim() : form.game,
        mic_or_experience_link: form.micOrExperience.trim() || null,
        video_idea: form.videoIdea.trim(),
      });
      setStatus("success");
      trackEvent("application_submit", { game: form.game });
      setForm(INITIAL_FORM);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Сервер сейчас недоступен. Попробуйте отправить заявку чуть позже."
      );
      setStatus("error");
    }
  };

  return (
    <section id="application" className="container-app py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="text-center sm:text-left">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">Войти в команду</p>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Заявка на участие
          </h2>
          <p className="mt-2 text-sm text-mute">
            Хотите сыграть с нами на ролике или ивенте — заполните форму,
            мы читаем каждую заявку.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="glass mt-8 rounded-2xl p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Игровой ник / имя" error={errors.nickname}>
               <input
                 type="text"
                 autoComplete="nickname"
                value={form.nickname}
                onChange={updateField("nickname")}
                placeholder="Steve_1337"
                className={inputClass(errors.nickname)}
              />
            </Field>

            <Field label="Контакт (Discord или Telegram)" error={errors.contact}>
               <input
                 type="text"
                 autoComplete="off"
                value={form.contact}
                onChange={updateField("contact")}
                placeholder="@username"
                className={inputClass(errors.contact)}
              />
            </Field>

            <Field label="Игра">
              <select
                value={form.game}
                onChange={updateField("game")}
                className={inputClass(false)}
              >
                {GAME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Возраст" error={errors.age}>
               <input
                 type="number"
                 inputMode="numeric"
                min={6}
                max={100}
                value={form.age}
                onChange={updateField("age")}
                placeholder="18"
                className={inputClass(errors.age)}
              />
            </Field>

            {form.game === "Другая игра" && (
              <Field label="Какая именно игра" error={errors.customGame}>
                <input
                  type="text"
                  value={form.customGame}
                  onChange={updateField("customGame")}
                  placeholder="Название игры"
                  className={inputClass(errors.customGame)}
                />
              </Field>
            )}

            <Field label="Ссылка на пример микрофона / опыт (необязательно)" full>
              <input
                type="text"
                value={form.micOrExperience}
                onChange={updateField("micOrExperience")}
                placeholder="Ссылка на клип, стрим или прошлые ролики"
                className={inputClass(false)}
              />
            </Field>

            <Field label="Идея для видео / сообщение" error={errors.videoIdea} full>
               <textarea
                 maxLength={2000}
                 aria-describedby={errors.videoIdea ? "video-idea-error" : undefined}
                rows={4}
                value={form.videoIdea}
                onChange={updateField("videoIdea")}
                placeholder="Расскажите, что хотите сыграть и почему это будет интересно"
                className={cn(inputClass(errors.videoIdea), "resize-none")}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3 text-sm font-medium text-void transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {status === "submitting" ? "Отправляем…" : "Отправить заявку"}
          </button>

          {status === "success" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald">
              <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
              Заявка отправлена. Мы свяжемся с вами по указанному контакту.
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-violet/30 bg-violet-soft px-4 py-3 text-sm text-violet">
              <XCircle className="h-[18px] w-[18px] shrink-0" />
              {serverError}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

function Field({ label, error, full = false, children }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", full && "sm:col-span-2")}>
      <span className="text-ink/90">{label}</span>
      {children}
      {error && <span id={label === "Идея для видео / сообщение" ? "video-idea-error" : undefined} role="alert" className="text-xs text-violet">{error}</span>}
    </label>
  );
}

function inputClass(hasError) {
  return cn(
    "rounded-lg border bg-void/40 px-3.5 py-2.5 text-sm text-ink placeholder:text-mute/70 transition-colors",
    "focus:outline-none focus:ring-1",
    hasError
      ? "border-violet/50 focus:border-violet focus:ring-violet/40"
      : "border-line focus:border-emerald/50 focus:ring-emerald/30"
  );
}
