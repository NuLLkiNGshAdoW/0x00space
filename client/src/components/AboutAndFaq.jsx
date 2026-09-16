import { ChevronDown, Gamepad2, Users, Sparkles } from "lucide-react";

const FAQ = [
  ["Как попасть на игровой ивент?", "Заполните заявку ниже и укажите свой ник, контакт и игру. Мы свяжемся с подходящими участниками."],
  ["В какие игры вы играете?", "Основные направления канала — Minecraft, кооперативные игры, хорроры и инди-проекты."],
  ["Где найти моды и сиды из роликов?", "Материалы и сиды публикуются в разделе выше. Используйте фильтр по игре и кнопки скачивания или копирования."],
  ["Можно предложить идею для видео?", "Да. Напишите идею в форме заявки — лучшие предложения мы добавляем в план будущих роликов."],
];

const GUIDES = [
  ["Сиды Minecraft", "Интересные миры, координаты и версии игры для новых приключений."],
  ["Моды и шейдеры", "Подборки материалов, которые помогают сделать выживание красивее и интереснее."],
  ["Кооперативные хорроры", "Игры, в которых страшнее всего становится именно вместе с друзьями."],
];

export default function AboutAndFaq() {
  return (
    <section id="about" aria-labelledby="about-title" className="border-t border-line py-16 sm:py-20">
      <div className="container-app">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald">О канале</p>
          <h2 id="about-title" className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
            Играем вместе, а не просто смотрим
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            0x00 SPACE — это канал о Minecraft, кооперативных играх и хоррорах.
            Здесь можно найти новые игры, полезные материалы и команду для следующего приключения.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            [Gamepad2, "Разные игры", "От Minecraft до свежих кооперативных проектов."],
            [Users, "Живое комьюнити", "Заявки зрителей становятся совместными роликами."],
            [Sparkles, "Полезный контент", "Гайды, сиды и материалы собраны в одном месте."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="glass rounded-xl p-5">
              <Icon className="h-5 w-5 text-emerald" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-medium text-ink">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-mute">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-emerald/20 bg-emerald-soft/20 p-5 sm:grid-cols-3">
          <p className="text-sm font-medium text-ink">Подписывайся, если хочешь:</p>
          <p className="text-sm text-mute">узнавать о новых роликах первым</p>
          <p className="text-sm text-mute">участвовать в совместных ивентах</p>
        </div>

        <div id="guides" className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-ink">Полезные разделы</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {GUIDES.map(([title, text], index) => (
              <article key={title} className="rounded-xl border border-line bg-panel/40 p-5">
                <h3 className="text-sm font-medium text-ink"><a className="hover:text-emerald" href={index === 0 ? "/seeds" : "/guides"}>{title}</a></h3>
                <p className="mt-2 text-xs leading-relaxed text-mute">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div id="faq" className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-ink">Частые вопросы</h2>
          <div className="mt-5 divide-y divide-line rounded-xl border border-line bg-panel/40 px-5">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink">
                  {question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-mute transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pt-3 text-sm leading-relaxed text-mute">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
