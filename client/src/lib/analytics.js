/** Безопасная обёртка: сайт работает и без подключённой аналитики. */
export function trackEvent(name, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
