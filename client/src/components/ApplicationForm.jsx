import { useState } from "react";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { submitApplication, ApiError } from "../services/api.js";
import { cn } from "../lib/utils.js";
import { trackEvent } from "../lib/analytics.js";
import { Link } from "react-router-dom";
import Button from "./Button.jsx";

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
  const [consent, setConsent] = useState(false);

  const updateField = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (Object.keys(errors).length > 0) setErrors(validate(next));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !consent) return;

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
      trackEvent("application_submit", { game: form.game, status: "success" });
      setForm(INITIAL_FORM);
      setConsent(false);
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
    <section id="application" className="container-app py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="text-center sm:text-left">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
            Войти в команду
          </p>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Заявка на участие
          </h2>
          <p className="mt-2 text-sm text-ink">
            Хотите сыграть с нами на ролике или ивенте — заполните форму, мы читаем каждую заявку.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="glass mt-8 rounded-2xl p-5 sm:p-7">
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
                onBlur={() => setErrors(validate(form))}
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
                onBlur={() => setErrors(validate(form))}
                required
                placeholder="@username"
                className={inputClass(errors.contact)}
              />
            </Field>

            <Field id="game" label="Игра">
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
                onBlur={() => setErrors(validate(form))}
                required
                placeholder="18"
                className={inputClass(errors.age)}
              />
            </Field>

            {form.game === "Другая игра" && (
              <Field id="custom-game" label="Какая именно игра" error={errors.customGame}>
                <input
                  type="text"
                value={form.customGame}
                id="custom-game"
                aria-invalid={Boolean(errors.customGame)}
                aria-describedby={errors.customGame ? "custom-game-error" : undefined}
                  onChange={updateField("customGame")}
                  onBlur={() => setErrors(validate(form))}
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
                onBlur={() => setErrors(validate(form))}
                required
                placeholder="Расскажите, что хотите сыграть и почему это будет интересно"
                className={cn(inputClass(errors.videoIdea), "resize-none")}
              />
            </Field>
          </div>

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="mt-6 w-full"
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {status === "submitting" ? "Отправляем…" : "Отправить заявку"}
          </Button>

          {status === "success" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald" role="status" aria-live="polite">
              <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
              Заявка отправлена. Мы свяжемся с вами по указанному контакту.
            </div>
          )}

          {status === "error" && (
             <div className="status-error mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm" role="alert">
              <XCircle className="h-[18px] w-[18px] shrink-0" />
              {serverError}
            </div>
          )}

          <label className="mt-4 flex items-start gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald"
              required
            />
            <span>
              Я согласен на обработку данных для связи по заявке. Подробнее — в{" "}
              <Link to="/privacy" className="text-emerald underline-offset-2 hover:underline">
                политике конфиденциальности
              </Link>.
            </span>
          </label>
        </form>
      </div>
    </section>
  );
}

function Field({ id, label, error, full = false, children }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", full && "sm:col-span-2")}>
      <span id={`${id}-label`} className="text-ink">{label}</span>
      {children}
      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          className="text-xs text-violet"
        >
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError) {
  return cn(
    "field-control",
    hasError
       ? "border-danger focus:border-danger focus:ring-danger/40"
       : "",
  );
}
