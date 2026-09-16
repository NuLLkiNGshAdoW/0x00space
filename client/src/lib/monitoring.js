// Optional Sentry bridge. The app remains fully functional when Sentry is absent.
export function captureError(error, context = {}) {
  const sentry = typeof window !== "undefined" ? window.Sentry : undefined;
  if (sentry?.captureException) sentry.captureException(error, { extra: safeContext(context) });
}

function safeContext(context) {
  return Object.fromEntries(Object.entries(context).filter(([key, value]) =>
    /^(source|status|error_type)$/.test(key) && ["string", "number", "boolean"].includes(typeof value),
  ));
}
