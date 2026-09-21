import { useEffect, useState } from "react";
import { API_ORIGIN, getBackgrounds } from "../services/api.js";

export default function ProfileBackdrop() {
  const [background, setBackground] = useState(null);
  const [customFailed, setCustomFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settings, setSettings] = useState({ shade: 0.68, blur: 0, position: "center", speed: 1 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener?.("change", updateMotion);
    let timer;
    getBackgrounds()
      .then((data) => {
        const list = data.items || [];
        const interval = Number(data.settings?.rotation_minutes || 0);
        const initial = data.active || null;
        setBackground(initial);
        setSettings((current) => ({ ...current, ...(data.settings || {}) }));
        if (interval > 0 && list.length > 1) {
          let index = Math.max(
            0,
            list.findIndex((item) => item.id === initial?.id),
          );
          timer = window.setInterval(
            () => {
              index = (index + 1) % list.length;
              setBackground(list[index]);
            },
            interval * 60 * 1000,
          );
        }
      })
      .catch(() => {});
    return () => {
      if (timer) window.clearInterval(timer);
      media.removeEventListener?.("change", updateMotion);
    };
  }, []);

  const url = background?.url ? `${API_ORIGIN}${background.url}` : null;
  // Текст должен оставаться читаемым даже если в старых настройках сохранено
  // слишком сильное затемнение фона.
  const readableShade = Math.max(Math.min(Number(settings.shade) || 0.68, 0.72), 0.58);
  const style = {
    "--profile-shade": readableShade,
    "--profile-blur": `${settings.blur}px`,
    "--profile-position": settings.position,
  };
  const mediaStyle = { ...style, objectPosition: settings.position };
  return (
    <>
      {!customFailed && background?.type === "video" && !reducedMotion ? (
        <video
          className="profile-backdrop profile-backdrop-custom"
          style={mediaStyle}
          src={url}
          poster="/profile-background.svg"
          onError={() => setCustomFailed(true)}
          autoPlay
          preload="metadata"
          muted
          loop
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = Math.max(0.25, Number(settings.speed) || 1);
          }}
          aria-hidden="true"
        />
      ) : !customFailed && background?.type === "image" ? (
        <img
          className="profile-backdrop profile-backdrop-custom"
          style={mediaStyle}
          src={url}
          alt=""
          width="1920"
          height="1080"
          loading="lazy"
          decoding="async"
          onError={() => setCustomFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <div className="profile-backdrop" style={style} aria-hidden="true" />
      )}
      <div
        className="profile-backdrop-shade"
        style={{ "--profile-shade": readableShade }}
        aria-hidden="true"
      />
    </>
  );
}
