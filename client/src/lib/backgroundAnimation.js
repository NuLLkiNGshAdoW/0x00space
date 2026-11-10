import { useEffect, useState } from "react";

const STORAGE_KEY = "0x00space.background-animation";
const CHANGE_EVENT = "0x00space-background-animation-change";

function readPreference() {
  try {
    const savedPreference = window.localStorage.getItem(STORAGE_KEY);
    if (savedPreference === "on") return true;
    if (savedPreference === "off") return false;
    return !window.matchMedia("(max-width: 640px)").matches;
  } catch {
    return typeof window !== "undefined" && !window.matchMedia("(max-width: 640px)").matches;
  }
}

export function useBackgroundAnimation() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return readPreference();
  });

  useEffect(() => {
    const sync = () => setEnabled(readPreference());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setAnimationEnabled = (nextValue) => {
    setEnabled(nextValue);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextValue ? "on" : "off");
    } catch {
      // Private browsing or blocked storage: keep the in-memory preference.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return [enabled, setAnimationEnabled];
}
