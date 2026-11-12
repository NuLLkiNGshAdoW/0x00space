import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onCLS, onINP, onLCP } from "web-vitals";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { trackEvent } from "./lib/analytics.js";
import { initializeMonitoring } from "./lib/monitoring.js";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=optional";

initializeMonitoring();

function loadFontsWithoutBlockingFirstPaint() {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.media = "print";
  stylesheet.href = GOOGLE_FONTS_URL;
  stylesheet.addEventListener(
    "load",
    () => {
      stylesheet.media = "all";
    },
    { once: true },
  );
  document.head.appendChild(stylesheet);
}

window.requestAnimationFrame(loadFontsWithoutBlockingFirstPaint);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Не удалось включить офлайн-режим:", error);
      });
    },
    { once: true },
  );
}

function reportWebVital({ name, value, rating }) {
  trackEvent("web_vital", {
    metric_name: name,
    value: Math.round(value),
    rating,
  });
}

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);

// Аналитика включается только после добавления ID в client/.env.
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (measurementId && !document.querySelector(`[data-ga="${measurementId}"]`)) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.ga = measurementId;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
}

// Deployments can inject window.Sentry; no SDK or DSN is required locally.

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
