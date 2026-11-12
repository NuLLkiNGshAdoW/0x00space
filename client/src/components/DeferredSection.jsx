import { Suspense, useEffect, useRef, useState } from "react";
import ErrorBoundary from "./ErrorBoundary.jsx";

export default function DeferredSection({ load, name, minHeight = "16rem" }) {
  const placeholderRef = useRef(null);
  const [Section, setSection] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Section) return undefined;
    const element = placeholderRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      load()
        .then((module) => setSection(() => module.default))
        .catch(() => setFailed(true));
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        load()
          .then((module) => setSection(() => module.default))
          .catch(() => setFailed(true));
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [Section, load]);

  if (failed) {
    return (
      <div className="container-app py-8" role="status">
        <p className="text-sm text-mute">Раздел временно недоступен. Обновите страницу.</p>
      </div>
    );
  }

  if (!Section) {
    return (
      <div
        ref={placeholderRef}
        data-deferred-section={name}
        aria-hidden="true"
        style={{ minHeight }}
      />
    );
  }

  return (
    <ErrorBoundary
      reloadOnReset
      title="Раздел временно недоступен"
      description="Не удалось загрузить этот раздел. Попробуйте обновить страницу."
    >
      <Suspense fallback={<div aria-hidden="true" style={{ minHeight }} />}>
        <Section />
      </Suspense>
    </ErrorBoundary>
  );
}
