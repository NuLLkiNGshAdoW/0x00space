import { Compass, HeartHandshake, Sparkles } from "lucide-react";

export default function CommunityBenefits() {
  return (
    <section className="container-app pb-16 sm:pb-20" aria-labelledby="community-title">
      <div className="rounded-2xl border border-violet/20 bg-violet-soft/20 p-6 sm:p-8">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet">Сообщество</p>
          <h2
            id="community-title"
            className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
            Как пользоваться сайтом
          </h2>
          <p className="mt-3 text-readable text-sm leading-relaxed">
            Здесь собраны реальные публикации канала и материалы, которые добавляются через админку. Выберите свой способ подключиться.
          </p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Benefit
            icon={Compass}
            title="Смотрите по теме"
            text="Фильтруйте видео по формату и находите свежие публикации канала."
          />
          <Benefit
            icon={HeartHandshake}
            title="Предложите участие"
            text="Оставьте заявку с игрой и контактом, если хотите попасть в будущий ивент."
          />
          <Benefit
            icon={Sparkles}
            title="Добавьте идею"
            text="Расскажите, что стоит пройти или снять вместе с сообществом."
          />
        </div>
      </div>
    </section>
  );
}
function Benefit({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl border border-line bg-panel/40 p-4">
      <Icon className="h-5 w-5 text-emerald" />
      <h3 className="mt-3 text-sm font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-readable text-xs leading-relaxed">{text}</p>
    </div>
  );
}
