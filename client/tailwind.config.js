/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070f", // фон страницы
        panel: "#0b1220", // база под стеклянные карточки
        panel2: "#111b2c", // чуть светлее панель (hover, вложенные блоки)
        line: "#223049", // спокойные рамки на тёмном фоне
        ink: "#f8fafc", // основной текст
        mute: "#a8b7cc", // вторичный текст, AA на тёмных панелях
        readable: "#e2e8f0", // основной текст на стекле
        emerald: {
          DEFAULT: "#34d399",
          soft: "#0f2e2a",
          glow: "#34d399",
        },
        violet: {
          DEFAULT: "#a78bfa",
          soft: "#241c3f",
          glow: "#8b5cf6",
        },
        amber: "#fbbf24",
        danger: "#fca5a5",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(71, 85, 105, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.16) 1px, transparent 1px)",
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
