import { ArrowUpRight, ClipboardList, Compass, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";

const BENEFITS = [
  {
    icon: Compass,
    title: "Выберите игру",
    text: "В заявке укажите Minecraft, кооп-хоррор или предложите свой вариант.",
  },
  {
    icon: HeartHandshake,
    title: "Оставьте контакт",
    text: "Напишите игровой ник и Discord или Telegram, чтобы с вами можно было связаться.",
  },
  {
    icon: ClipboardList,
    title: "Расскажите о задумке",
    text: "Коротко опишите идею для видео или совместной игры — это поможет понять формат.",
  },
];

export default function CommunityBenefits() {
  return (
    <section className="container-app pb-16 sm:pb-20" aria-labelledby="community-title">
      <div className="section-shell rounded-3xl border-violet/25 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.35fr] lg:items-center">
          <div>
            <p className="eyebrow text-violet">Сообщество</p>
            <h2
              id="community-title"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              Не только смотреть — играть вместе
            </h2>
            <p className="text-readable mt-3 text-sm leading-relaxed">
              Хочешь появиться в совместном ролике или предложить идею? Оставь заявку: команда
              рассмотрит её и свяжется с тобой, если формат подойдёт.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/videos" className="button-secondary">
                Посмотреть ролики
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#application" className="button-ghost">
                Заполнить заявку
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }, index) => (
              <div
                key={title}
                className="group rounded-2xl border border-line/80 bg-void/35 p-4 transition-colors hover:border-emerald/30 hover:bg-panel2/60"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel2 text-emerald">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-[10px] text-mute">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
                <p className="text-readable mt-1.5 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
