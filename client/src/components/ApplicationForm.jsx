import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getEvent, submitApplication, ApiError } from "../services/api.js";
import { OTHER_GAME, validateApplicationForm } from "../lib/application-validation.js";
import { cn } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";
import { Link, useSearchParams } from "react-router-dom";
import Button from "./Button.jsx";

const GAME_OPTIONS = ["Minecraft", "Phasmophobia", "Lethal Company", OTHER_GAME];

const INITIAL_FORM = {
  nickname: "",
  contact: "",
  game: GAME_OPTIONS[0],
  customGame: "",
  age: "",
  micOrExperience: "",
  videoIdea: "",
  consent: false,
};

export default function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("event_id") || "";
  const eventQuery = useQuery({
    queryKey: ["application-event", eventId],
    queryFn: () => getEvent(eventId),
    enabled: Boolean(eventId),
    retry: false,
  });
  const eventCapacityFull = Boolean(
    eventQuery.data?.max_participants != null &&
    eventQuery.data.application_count >= eventQuery.data.max_participants,
  );
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [serverError, setServerError] = useState("");
  const [touched, setTouched] = useState({});
  const hasTrackedStart = useRef(false);

  const trackApplicationStart = () => {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackEvent("application_start", { source: "application_form" });
  };

  const updateField = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field])
      setErrors((current) => ({ ...current, [field]: validateApplicationForm(next)[field] }));
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateApplicationForm(form)[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateApplicationForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    setServerError("");

    try {
      await submitApplication({
        nickname: form.nickname.trim(),
        age: Number(form.age),
        contact: form.contact.trim(),
        game: form.game === OTHER_GAME ? form.customGame.trim() : form.game,
        mic_or_experience_link: form.micOrExperience.trim() || null,
        video_idea: form.videoIdea.trim(),
        event_id: eventId || null,
      });
      setStatus("success");
      trackEvent("application_submit", { game: form.game, status: "success" });
      setForm(INITIAL_FORM);
      setTouched({});
    } catch (err) {
      trackEvent("application_error", { status: err instanceof ApiError ? err.status : "network" });
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Сервер сейчас недоступен. Попробуйте отправить заявку чуть позже.",
      );
      setStatus("error");
    }
  };

  return (
    <section id="application" className="application-section container-app py-16 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-24">
          <p className="eyebrow">Войти в команду</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
            Заявка на участие
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-mute">
            Хотите сыграть с нами на ролике или ивенте — заполните форму. Мы читаем каждую заявку.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              ["01", "Расскажите о себе", "Ник, контакт и удобная игра для совместной записи."],
              ["02", "Опишите идею", "Что хотите сыграть и почему это будет интересно зрителям."],
              ["03", "Дождитесь ответа", "Мы свяжемся по указанному контакту перед записью."],
            ].map(([number, title, text]) => (
              <li key={number} className="application-step flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 font-mono text-[10px] text-emerald">
                  {number}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-mute">{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-2xl border border-line bg-panel/40 p-4">
            <p className="text-xs font-medium text-ink">Что дальше?</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Заявка попадает в общую очередь. Если формат подойдёт, мы напишем и обсудим детали.
            </p>
          </div>
          {eventId && eventQuery.data && (
            <div className="mt-3 rounded-2xl border border-violet/30 bg-violet-soft/40 p-4">
              <p className="text-xs font-medium text-violet">Заявка на ивент</p>
              <p className="mt-1 text-sm font-semibold text-ink">{eventQuery.data.title}</p>
              <p className="mt-1 text-xs text-mute">
                {eventQuery.data.game} ·{" "}
                {new Date(eventQuery.data.starts_at).toLocaleString("ru-RU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {eventCapacityFull && (
                <p role="status" className="mt-2 text-xs text-amber">
                  Все места уже заняты.
                </p>
              )}
              <Link
                to="/#application"
                className="mt-2 inline-flex text-xs text-emerald hover:underline"
              >
                Подать обычную заявку
              </Link>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          onFocusCapture={trackApplicationStart}
          noValidate
          className="application-form glass rounded-3xl p-5 shadow-2xl shadow-emerald/5 sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
              Форма заявки
            </span>
            <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-mute">
              ~2 минуты
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="nickname" label="Игровой ник / имя" error={errors.nickname}>
              <input
                type="text"
                autoComplete="nickname"
                value={form.nickname}
                id="nickname"
                aria-invalid={Boolean(errors.nickname)}
                aria-describedby={errors.nickname ? "nickname-error" : undefined}
                onChange={updateField("nickname")}
                onBlur={() => handleBlur("nickname")}
                maxLength={64}
                required
                placeholder="Steve_1337"
                className={inputClass(errors.nickname)}
              />
            </Field>

            <Field id="contact" label="Контакт (Discord или Telegram)" error={errors.contact}>
              <input
                type="text"
                autoComplete="off"
                value={form.contact}
                id="contact"
                aria-invalid={Boolean(errors.contact)}
                aria-describedby={errors.contact ? "contact-error" : undefined}
                onChange={updateField("contact")}
                onBlur={() => handleBlur("contact")}
                maxLength={64}
                required
                placeholder="@username"
                className={inputClass(errors.contact)}
              />
            </Field>

            <Field id="game" label="Игра">
              {eventId && eventQuery.data ? (
                <input
                  id="game"
                  value={eventQuery.data.game}
                  readOnly
                  className={inputClass(false)}
                />
              ) : (
                <select
                  value={form.game}
                  id="game"
                  onChange={updateField("game")}
                  className={inputClass(false)}
                >
                  {GAME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field id="age" label="Возраст" error={errors.age}>
              <input
                type="number"
                inputMode="numeric"
                min={6}
                max={100}
                value={form.age}
                id="age"
                aria-invalid={Boolean(errors.age)}
                aria-describedby={errors.age ? "age-error" : undefined}
                onChange={updateField("age")}
                onBlur={() => handleBlur("age")}
                required
                placeholder="18"
                className={inputClass(errors.age)}
              />
            </Field>

            {form.game === OTHER_GAME && (
              <Field id="custom-game" label="Какая именно игра" error={errors.customGame}>
                <input
                  type="text"
                  value={form.customGame}
                  id="custom-game"
                  aria-invalid={Boolean(errors.customGame)}
                  aria-describedby={errors.customGame ? "custom-game-error" : undefined}
                  onChange={updateField("customGame")}
                  onBlur={() => handleBlur("customGame")}
                  maxLength={64}
                  required
                  placeholder="Название игры"
                  className={inputClass(errors.customGame)}
                />
              </Field>
            )}

            <Field id="video-idea" label="Идея для видео / сообщение" error={errors.videoIdea} full>
              <textarea
                maxLength={2000}
                aria-invalid={Boolean(errors.videoIdea)}
                aria-describedby={errors.videoIdea ? "video-idea-error" : undefined}
                rows={4}
                value={form.videoIdea}
                id="video-idea"
                onChange={updateField("videoIdea")}
                onBlur={() => handleBlur("videoIdea")}
                required
                placeholder="Расскажите, что хотите сыграть и почему это будет интересно"
                className={cn(inputClass(errors.videoIdea), "resize-none")}
              />
            </Field>
            <Field id="mic-or-experience" label="Ссылка на опыт или микрофон (необязательно)" full>
              <input
                type="url"
                value={form.micOrExperience}
                id="mic-or-experience"
                onChange={updateField("micOrExperience")}
                placeholder="https://..."
                className="field-control"
              />
            </Field>
          </div>

          {status === "success" && (
            <div
              className="mt-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
              Заявка отправлена. Мы свяжемся с вами по указанному контакту.
            </div>
          )}

          {status === "error" && (
            <div
              className="status-error mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
              role="alert"
            >
              <XCircle className="h-[18px] w-[18px] shrink-0" />
              {serverError}
            </div>
          )}

          {eventId && eventQuery.isPending && (
            <p role="status" className="mt-4 text-xs text-mute">
              Загружаем сведения об ивенте…
            </p>
          )}
          {eventId && eventQuery.isError && (
            <p role="alert" className="mt-4 text-xs text-violet">
              Не удалось загрузить ивент. Возможно, регистрация уже закрыта.
            </p>
          )}

          <label className="mt-4 flex items-start gap-2 text-xs text-mute">
            <input
              type="checkbox"
              checked={form.consent}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              onChange={(event) => {
                const nextConsent = event.target.checked;
                setForm((current) => ({ ...current, consent: nextConsent }));
                setTouched((current) => ({ ...current, consent: true }));
                setErrors((current) => ({
                  ...current,
                  consent: nextConsent
                    ? undefined
                    : validateApplicationForm({ ...form, consent: nextConsent }).consent,
                }));
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald"
              required
            />
            <span>
              Я согласен на обработку данных для связи по заявке. Подробнее — в{" "}
              <Link to="/privacy" className="text-emerald underline-offset-2 hover:underline">
                политике конфиденциальности
              </Link>
              .
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" role="alert" className="mt-2 text-xs text-violet">
              {errors.consent}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              status === "submitting" ||
              (Boolean(eventId) && (!eventQuery.data || eventQuery.isError || eventCapacityFull))
            }
            className="mt-6 w-full"
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {status === "submitting" ? "Отправляем…" : "Отправить заявку"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function Field({ id, label, error, full = false, children }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", full && "sm:col-span-2")}>
      <span id={`${id}-label`} className="text-ink">
        {label}
      </span>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-violet">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError) {
  return cn(
    "field-control",
    hasError ? "border-danger focus:border-danger focus:ring-danger/40" : "",
  );
}
