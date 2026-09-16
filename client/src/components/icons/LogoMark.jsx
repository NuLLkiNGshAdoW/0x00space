/**
 * Фирменный знак 0x00 SPACE: шестиугольная рамка (намёк на "нулевой байт"/адрес памяти)
 * с диагональным разломом — пересечение "игры" и "space/эфира".
 * Сделан вручную под бренд, а не взят из общей библиотеки иконок.
 */
export default function LogoMark({ className = "h-8 w-8" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z"
        stroke="url(#logoStroke)"
        strokeWidth="1.6"
        fill="#12382f"
      />
      <path d="M13 15 L27 25" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 25 L27 15" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.4" fill="#e7ecf3" />
      <defs>
        <linearGradient
          id="logoStroke"
          x1="4"
          y1="2"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
