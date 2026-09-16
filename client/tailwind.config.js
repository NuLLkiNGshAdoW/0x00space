/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070d",       // фон страницы
        panel: "#0d1420",      // база под стеклянные карточки
        panel2: "#101a29",     // чуть светлее панель (hover, вложенные блоки)
        line: "rgba(148, 163, 184, 0.14)", // тонкие рамки на тёмном фоне
        ink: "#e7ecf3",        // основной текст
        mute: "#b2bdcf",       // приглушённый, но читаемый текст
        emerald: {
          DEFAULT: "#10b981",
          soft: "rgba(16, 185, 129, 0.14)",
          glow: "rgba(16, 185, 129, 0.45)",
        },
        violet: {
          DEFAULT: "#8b5cf6",
          soft: "rgba(139, 92, 246, 0.14)",
          glow: "rgba(139, 92, 246, 0.45)",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
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
