const allowedContextKeys = /^(source|status|error_type)$/;
const safeLabel = /^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/;
let sentryInitialization;

export function initializeMonitoring() {
  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  if (!dsn || sentryInitialization) return sentryInitialization;

  sentryInitialization = import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment:
          import.meta.env?.VITE_SENTRY_ENVIRONMENT || import.meta.env?.MODE || "development",
        release: import.meta.env?.VITE_SENTRY_RELEASE || undefined,
        sendDefaultPii: false,
        maxBreadcrumbs: 0,
        tracesSampleRate: 0,
        beforeSend: sanitizeSentryEvent,
      });
      return Sentry;
    })
    .catch((error) => {
      console.error("Не удалось инициализировать Sentry:", error);
      return null;
    });
  return sentryInitialization;
}

export function captureError(error, context = {}) {
  if (
    !import.meta.env?.VITE_SENTRY_DSN ||
    !shouldCaptureError(context, error) ||
    !sentryInitialization
  ) {
    return;
  }

  void sentryInitialization.then((Sentry) => {
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(safeContext(context))) {
        scope.setTag(key, String(value));
      }
      Sentry.captureException(error);
    });
  });
}

export function shouldCaptureError(context = {}, error) {
  if (error?.name === "AbortError" || error?.name === "TimeoutError") return false;
  if (context.error_type === "api") return Number(context.status) >= 500;
  return true;
}

export function safeContext(context = {}) {
  return Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) => {
      if (!allowedContextKeys.test(key)) return [];
      if (key === "status") {
        return Number.isInteger(value) && value >= 0 && value <= 599 ? [[key, value]] : [];
      }
      if (typeof value !== "string") return [];
      if (key === "source" && value.startsWith("/")) return [[key, "api"]];
      return safeLabel.test(value) ? [[key, value]] : [];
    }),
  );
}

export function sanitizeSentryEvent(event) {
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.transaction;
  event.message = "Client error";

  for (const exception of event.exception?.values || []) {
    exception.value = exception.type || "Error";
  }

  if (event.request) {
    const method = event.request.method;
    event.request = method ? { method } : {};
  }
  return event;
}
