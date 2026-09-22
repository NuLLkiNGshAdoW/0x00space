import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import Button from "./Button.jsx";
import { getApiErrorState } from "../services/api.js";

const MESSAGES = {
  loading: "Загрузка…",
  waking: "Сервер просыпается…",
  network: "Не удалось подключиться к серверу.",
  server: "Сервер вернул ошибку.",
  unauthorized: "Нужна авторизация администратора.",
  forbidden: "Недостаточно прав для этого действия.",
  "not-found": "Запрошенные данные не найдены.",
  "rate-limit": "Слишком много запросов. Попробуйте немного позже.",
};

export default function ApiState({
  status,
  error,
  onRetry,
  message,
  compact = false,
  className = "",
}) {
  const state = status === "error" ? getApiErrorState(error) : status;
  const isLoading = state === "loading" || state === "waking";
  const text = message || MESSAGES[state] || MESSAGES.server;

  return (
    <div
      className={`${compact ? "flex items-center gap-2 text-sm text-mute" : "glass rounded-2xl p-8 text-center"} ${
        className
      }`}
      role={isLoading ? "status" : "alert"}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mx-auto h-7 w-7 shrink-0 text-violet" aria-hidden="true" />
      )}
      <span>{text}</span>
      {onRetry && !isLoading && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Повторить
        </Button>
      )}
    </div>
  );
}
