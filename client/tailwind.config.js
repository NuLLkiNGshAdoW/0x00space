/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#06100b", // глубокий лесной фон
        panel: "#0b1912", // база под стеклянные карточки
        panel2: "#14271b", // приподнятая поверхность и hover
        line: "#294435", // мягкие лесные границы
        ink: "#f5f8f2", // основной текст
        mute: "#b0c1b3", // вторичный текст
        readable: "#e2e8f0", // основной текст на стекле
        emerald: {
          DEFAULT: "#55dc91",
          soft: "#123324",
          glow: "#78e9a2",
        },
        violet: {
          DEFAULT: "#c0a4ff",
          soft: "#2b2043",
          glow: "#a98aff",
        },
        amber: "#f3bd59",
        danger: "#fca5a5",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(139, 174, 145, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 174, 145, 0.14) 1px, transparent 1px)",
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
