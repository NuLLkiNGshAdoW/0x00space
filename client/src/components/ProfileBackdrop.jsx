import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_ORIGIN, BACKGROUNDS_QUERY_OPTIONS } from "../services/api.js";
import { useBackgroundAnimation } from "../lib/backgroundAnimation.js";

const LOCAL_POSTER = "/assets/minecraft-forest-poster.webp";
const LOCAL_DESKTOP_MP4 = "/assets/minecraft-forest-desktop.mp4";
const LOCAL_MOBILE_MP4 = "/assets/minecraft-forest-mobile.mp4";

export default function ProfileBackdrop() {
  const [background, setBackground] = useState(null);
  const [customFailed, setCustomFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const localVideoRef = useRef(null);
  const customVideoRef = useRef(null);
  const [settings, setSettings] = useState({
    shade: 0.38,
    blur: 0,
    position: "center",
    speed: 1,
  });
  const [animationEnabled] = useBackgroundAnimation();
  const [localVideoFailed, setLocalVideoFailed] = useState(false);
  const { data } = useQuery(BACKGROUNDS_QUERY_OPTIONS);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener?.("change", updateMotion);
    let timer;
    if (data) {
      const list = data.items || [];
      const interval = Number(data.settings?.rotation_minutes || 0);
      const initial = data.active || null;
      setBackground(initial);
      setCustomFailed(false);
      setSettings((current) => ({ ...current, ...(data.settings || {}) }));
      if (interval > 0 && list.length > 1) {
        let index = Math.max(
          0,
          list.findIndex((item) => item.id === initial?.id),
        );
        timer = window.setInterval(
          () => {
            index = (index + 1) % list.length;
            setCustomFailed(false);
            setBackground(list[index]);
          },
          interval * 60 * 1000,
        );
      }
    }
    return () => {
      if (timer) window.clearInterval(timer);
      media.removeEventListener?.("change", updateMotion);
    };
  }, [data]);

  const activeBackground = data?.active ?? background;
  const hasDatabaseBackground = Boolean(activeBackground?.url);
  const localVideoActive =
    !hasDatabaseBackground && animationEnabled && !reducedMotion && !localVideoFailed;
  const url = activeBackground?.url
    ? /^https?:\/\//i.test(activeBackground.url)
      ? activeBackground.url
      : `${API_ORIGIN}${activeBackground.url}`
    : null;
  // Текст должен оставаться читаемым даже если в старых настройках сохранено
  // слишком сильное затемнение фона.
  const shade = Number(settings.shade);
  const readableShade = Number.isFinite(shade) ? Math.max(Math.min(shade, 0.48), 0.25) : 0.38;
  const style = {
    "--profile-shade": readableShade,
    "--profile-blur": `${settings.blur}px`,
    "--profile-position": settings.position,
  };
  const mediaStyle = { ...style, objectPosition: settings.position };
  const localVideoSrc =
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
      ? LOCAL_MOBILE_MP4
      : LOCAL_DESKTOP_MP4;
  const showDatabaseVideo =
    activeBackground?.type === "video" && animationEnabled && !reducedMotion && !customFailed;
  const showDatabaseImage = activeBackground?.type === "image" && !customFailed;

  // Не полагаемся только на autoplay: после появления video в DOM явно запускаем
  // его один раз, а при смене состояния корректно останавливаем старый элемент.
  useEffect(() => {
    const video = localVideoActive
      ? localVideoRef.current
      : showDatabaseVideo
        ? customVideoRef.current
        : null;
    if (!video) return undefined;

    let cancelled = false;
    let playStarted = false;
    const fail = () => {
      if (cancelled) return;
      if (localVideoActive) setLocalVideoFailed(true);
      else setCustomFailed(true);
    };
    const startPlayback = () => {
      if (cancelled || playStarted || !video.paused) return;
      playStarted = true;
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      playPromise?.catch(fail);
    };

    video.addEventListener("canplay", startPlayback, { once: true });
    video.addEventListener("loadeddata", startPlayback, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) startPlayback();

    return () => {
      cancelled = true;
      video.pause();
      video.removeEventListener("canplay", startPlayback);
      video.removeEventListener("loadeddata", startPlayback);
    };
  }, [localVideoActive, showDatabaseVideo]);

  useEffect(() => {
    if (animationEnabled && !reducedMotion) {
      setLocalVideoFailed(false);
      setCustomFailed(false);
    }
  }, [animationEnabled, reducedMotion]);

  return (
    <>
      {showDatabaseVideo ? (
        <video
          className="profile-backdrop profile-backdrop-custom"
          ref={customVideoRef}
          style={mediaStyle}
          src={url}
          poster={LOCAL_POSTER}
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
      ) : showDatabaseImage ? (
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
      ) : localVideoActive ? (
        <video
          className="profile-backdrop profile-backdrop-custom profile-backdrop-local"
          ref={localVideoRef}
          src={localVideoSrc}
          poster={LOCAL_POSTER}
          onError={() => setLocalVideoFailed(true)}
          autoPlay
          preload="metadata"
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      ) : (
        <img
          className="profile-backdrop profile-backdrop-custom profile-backdrop-poster"
          src={activeBackground?.type === "image" && !customFailed ? url : LOCAL_POSTER}
          alt=""
          width="1280"
          height="720"
          decoding="async"
          aria-hidden="true"
        />
      )}
      <div
        className={`profile-backdrop-shade${localVideoActive ? " profile-backdrop-shade-local" : ""}`}
        style={{ "--profile-shade": localVideoActive ? 0.44 : readableShade }}
        aria-hidden="true"
      />
    </>
  );
}
