/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070d", // фон страницы
        panel: "#0d1420", // база под стеклянные карточки
        panel2: "#101a29", // чуть светлее панель (hover, вложенные блоки)
        line: "#25334a", // спокойные рамки на тёмном фоне
        ink: "#f1f5f9", // основной текст
        mute: "#aebbd0", // вторичный текст, AA на тёмных панелях
        emerald: {
          DEFAULT: "#34d399",
          soft: "#12382f",
          glow: "#34d399",
        },
        violet: {
          DEFAULT: "#b69cff",
          soft: "#282044",
          glow: "#8b5cf6",
        },
        danger: "#fca5a5",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(#475569 1px, #05070d 1px), linear-gradient(90deg, #475569 1px, #05070d 1px)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        scanline: "scanline 5s linear infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
