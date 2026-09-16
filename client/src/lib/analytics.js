/** Безопасная обёртка: сайт работает и без подключённой аналитики. */
export function trackEvent(name, params = {}) {
  if (typeof window.gtag !== "function") return;
  const safeParams = Object.fromEntries(Object.entries(params).filter(([key, value]) =>
    /^(video_id|game|source|status|error_type)$/.test(key) &&
    ["string", "number", "boolean"].includes(typeof value),
  ));
  window.gtag("event", name, safeParams);
}
