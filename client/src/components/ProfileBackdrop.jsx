import { useEffect, useState } from "react";
import { API_ORIGIN, getBackgrounds } from "../services/api.js";

export default function ProfileBackdrop() {
  const [background, setBackground] = useState(null);
  const [settings, setSettings] = useState({ shade: 0.88, blur: 0, position: "center", speed: 1 });

  useEffect(() => {
    let timer;
    getBackgrounds().then((data) => {
      const list = data.items || [];
      const interval = Number(data.settings?.rotation_minutes || 0);
      const initial = data.active || null;
      setBackground(initial);
      setSettings((current) => ({ ...current, ...(data.settings || {}) }));
      if (interval > 0 && list.length > 1) {
        let index = Math.max(0, list.findIndex((item) => item.id === initial?.id));
        timer = window.setInterval(() => { index = (index + 1) % list.length; setBackground(list[index]); }, interval * 60 * 1000);
      }
    }).catch(() => {});
    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  const url = background?.url ? `${API_ORIGIN}${background.url}` : null;
  const style = { "--profile-shade": settings.shade, "--profile-blur": `${settings.blur}px`, "--profile-position": settings.position };
  return (
    <>
      {background?.type === "video" ? (
        <video className="profile-backdrop profile-backdrop-custom" style={style} src={url} playbackRate={settings.speed} autoPlay muted loop playsInline aria-hidden="true" />
      ) : background?.type === "image" ? (
        <div className="profile-backdrop profile-backdrop-custom" style={{ ...style, backgroundImage: `url("${url}")` }} aria-hidden="true" />
      ) : (
        <div className="profile-backdrop" style={style} aria-hidden="true" />
      )}
      <div className="profile-backdrop-shade" style={{ "--profile-shade": settings.shade }} aria-hidden="true" />
    </>
  );
}
