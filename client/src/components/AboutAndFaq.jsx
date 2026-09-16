import { ChevronDown, Gamepad2, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const FAQ = [
  [
    "Как попасть на игровой ивент?",
    "Заполните заявку ниже и укажите свой ник, контакт и игру. Мы свяжемся с подходящими участниками.",
  ],
  [
    "В какие игры вы играете?",
    "Основные направления канала — Minecraft, кооперативные игры, хорроры и инди-проекты.",
  ],
  [
    "Где найти моды и сиды из роликов?",
    "Материалы и сиды публикуются в разделе выше. Используйте фильтр по игре и кнопки скачивания или копирования.",
  ],
  [
    "Можно предложить идею для видео?",
    "Да. Напишите идею в форме заявки — лучшие предложения мы добавляем в план будущих роликов.",
  ],
];

const GUIDES = [
  ["Сиды Minecraft", "Интересные миры, координаты и версии игры для новых приключений."],
  [
    "Моды и шейдеры",
    "Подборки материалов, которые помогают сделать выживание красивее и интереснее.",
  ],
  ["Кооперативные хорроры", "Игры, в которых страшнее всего становится именно вместе с друзьями."],
];

export default function AboutAndFaq() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-t border-line py-16 sm:py-20"
    >
      <div className="container-app">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald">О канале</p>
          <h2
            id="about-title"
            className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
            Играем вместе, а не просто смотрим
          </h2>
          <p className="text-readable mt-3 text-sm leading-relaxed">
             0x00 SPACE — канал о Minecraft, кооперативных играх и хоррорах. На сайте можно смотреть
             публикации канала, открывать доступные материалы и отправлять идеи для совместных игр.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link className="text-emerald underline-offset-4 hover:underline" to="/events">Правила участия и ивенты</Link>
            <Link className="text-emerald underline-offset-4 hover:underline" to="/contacts">Контакты</Link>
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            [Gamepad2, "Разные игры", "От Minecraft до свежих кооперативных проектов."],
             [Users, "Участие по заявке", "Оставьте контакт и идею: команда рассмотрит заявку перед ивентом."],
            [Sparkles, "Полезный контент", "Гайды, сиды и материалы собраны в одном месте."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="glass rounded-xl p-5">
              <Icon className="h-5 w-5 text-emerald" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-medium text-ink">{title}</h3>
              <p className="text-readable mt-1.5 text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-emerald/20 bg-emerald-soft/20 p-5 sm:grid-cols-3">
           <p className="text-sm font-medium text-ink">Выберите следующий шаг:</p>
           <Link className="text-sm text-emerald hover:underline" to="/videos">Открыть видео</Link>
           <a className="text-sm text-emerald hover:underline" href="#application">Отправить идею</a>
        </div>

        <div className="mt-16" aria-labelledby="how-it-works-title">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet">Как это работает</p>
          <h2 id="how-it-works-title" className="mt-3 font-display text-2xl font-semibold text-ink">От идеи до совместной игры</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Смотрите", "Выбирайте ролики и материалы по игре или формату."],
              ["02", "Предлагайте", "Оставьте заявку с идеей, игрой и удобным контактом."],
              ["03", "Договариваемся", "Если формат подойдёт, мы свяжемся с вами перед записью."],
            ].map(([number, title, text]) => (
              <section key={number} className="rounded-xl border border-line bg-panel/40 p-5">
                <span className="font-mono text-xs text-violet">{number}</span>
                <h3 className="mt-3 text-sm font-medium text-ink">{title}</h3>
                <p className="text-readable mt-2 text-xs leading-relaxed">{text}</p>
              </section>
            ))}
          </div>
        </div>

        <div id="guides" className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-ink">Полезные разделы</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {GUIDES.map(([title, text], index) => (
              <article key={title} className="rounded-xl border border-line bg-panel/40 p-5">
                <h3 className="text-sm font-medium text-ink">
                  <Link className="hover:text-emerald" to={index === 0 ? "/seeds" : "/guides"}>
                    {title}
                  </Link>
                </h3>
                <p className="text-readable mt-2 text-xs leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div id="faq" className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-ink">Частые вопросы</h2>
          <div className="mt-5 divide-y divide-line rounded-xl border border-line bg-panel/40 px-5">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group py-4">
            <summary className="interactive-control flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium text-ink">
                  {question}
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-mute transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="text-readable pt-3 text-sm leading-relaxed">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
