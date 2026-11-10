import { ArrowUpRight, Compass, HeartHandshake, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const BENEFITS = [
  {
    icon: Compass,
    title: "Смотрите по теме",
    text: "Фильтруйте видео по формату и находите свежие публикации канала.",
  },
  {
    icon: HeartHandshake,
    title: "Предложите участие",
    text: "Оставьте заявку с игрой и контактом, если хотите попасть в будущий ивент.",
  },
  {
    icon: Sparkles,
    title: "Добавьте идею",
    text: "Расскажите, что стоит пройти или снять вместе с сообществом.",
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
              Как пользоваться сайтом
            </h2>
            <p className="text-readable mt-3 text-sm leading-relaxed">
              Здесь собраны реальные публикации канала и материалы, которые добавляются через
              админку. Выберите свой способ подключиться.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/videos" className="button-secondary">
                Смотреть видео
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#application" className="button-ghost">
                Подать заявку
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
