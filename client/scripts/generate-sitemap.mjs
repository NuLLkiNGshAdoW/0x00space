import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = (process.env.VITE_SITE_URL || "https://0x00space.vercel.app").replace(/\/+$/, "");
const configuredApiBaseUrl = (
  process.env.SITEMAP_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "https://zerox00space-api.onrender.com/api"
).trim();
const apiBaseUrl = /^https?:\/\//i.test(configuredApiBaseUrl)
  ? configuredApiBaseUrl.replace(/\/+$/, "")
  : `${siteUrl}${configuredApiBaseUrl.startsWith("/") ? "" : "/"}${configuredApiBaseUrl}`.replace(
      /\/+$/,
      "",
    );

const FALLBACK_ROUTES = [
  ["/", "1.0", "daily"],
  ["/videos", "0.9", "daily"],
  ["/materials", "0.8", "weekly"],
  ["/guides", "0.8", "weekly"],
  ["/seeds", "0.8", "weekly"],
  ["/events", "0.7", "weekly"],
  ["/about", "0.6", "monthly"],
  ["/faq", "0.6", "monthly"],
  ["/contacts", "0.5", "monthly"],
  ["/privacy", "0.2", "yearly"],
];

const STATIC_SEO_PAGES = [
  {
    path: "/videos",
    title: "Видео — 0x00 SPACE",
    description: "Последние видео и Shorts 0x00 SPACE о Minecraft, кооп-играх и хоррорах.",
    schemaType: "CollectionPage",
  },
  {
    path: "/materials",
    title: "Материалы и сиды Minecraft — 0x00 SPACE",
    description: "Моды, шейдеры, текстуры, гайды и сиды Minecraft из роликов 0x00 SPACE.",
    schemaType: "CollectionPage",
  },
  {
    path: "/events",
    title: "Игровые ивенты — 0x00 SPACE",
    description: "Актуальные игровые события 0x00 SPACE: Minecraft, кооп-хорроры и инди-игры.",
    schemaType: "CollectionPage",
  },
  {
    path: "/about",
    title: "О канале 0x00 SPACE",
    description: "Игровое сообщество о Minecraft, кооперативных играх и хоррорах.",
    schemaType: "AboutPage",
  },
  {
    path: "/faq",
    title: "Частые вопросы — 0x00 SPACE",
    description: "Ответы о видео, материалах Minecraft и участии в игровых событиях 0x00 SPACE.",
    schemaType: "FAQPage",
  },
  {
    path: "/guides",
    title: "Гайды по Minecraft и кооперативным играм — 0x00 SPACE",
    description: "Инструкции по модам, шейдерам, Minecraft и совместным играм.",
    schemaType: "WebPage",
  },
  {
    path: "/seeds",
    title: "Сиды Minecraft и координаты — 0x00 SPACE",
    description: "Интересные миры и сиды Minecraft для выживания, строительства и игры с друзьями.",
    schemaType: "WebPage",
  },
  {
    path: "/contacts",
    title: "Контакты — 0x00 SPACE",
    description: "Свяжитесь с 0x00 SPACE, предложите идею или отправьте заявку на участие.",
    schemaType: "ContactPage",
  },
  {
    path: "/privacy",
    title: "Политика конфиденциальности — 0x00 SPACE",
    description: "Как 0x00 SPACE использует данные, переданные через форму участия.",
    schemaType: "WebPage",
  },
];

const STATIC_PAGE_CONTENT = {
  "/videos": {
    heading: "Видео 0x00 SPACE",
    sections: [
      [
        "Медиатека канала",
        "Все ролики и Shorts канала в одном месте: ищите по названию, фильтруйте формат и открывайте выпуск.",
      ],
    ],
  },
  "/materials": {
    heading: "Материалы и сиды Minecraft",
    sections: [
      [
        "Арсенал игрока",
        "Моды, шейдеры, текстур-паки, гайды и сиды миров. Фильтруйте по игре и забирайте то, что пригодится в следующем прохождении.",
      ],
      ["Гайды", "Инструкции по Minecraft и совместным играм собраны в разделе гайдов."],
      ["Сиды", "Смотрите версии Minecraft и координаты интересных мест в разделе сидов."],
    ],
  },
  "/events": {
    heading: "Игровые ивенты 0x00 SPACE",
    sections: [
      ["Как принять участие", "Заполните заявку на главной странице и укажите игру и контакт."],
      [
        "Что потребуется",
        "Рабочий микрофон, подходящая игра и готовность соблюдать правила общения в команде.",
      ],
      [
        "Связь с участниками",
        "Мы свяжемся с выбранными участниками по указанному контакту перед записью.",
      ],
    ],
  },
  "/about": {
    heading: "О канале 0x00 SPACE",
    sections: [
      ["Что мы снимаем", "Выживание, кооперативные прохождения, хорроры, челленджи и инди-игры."],
      [
        "Для кого канал",
        "Для игроков, которым нравятся атмосферные ролики и совместная игра с сообществом.",
      ],
      [
        "Что есть на сайте",
        "Видео, сиды, моды, гайды и возможность подать заявку на совместный ивент.",
      ],
    ],
  },
  "/faq": {
    heading: "Частые вопросы",
    sections: [
      ["Как попасть в ролик?", "Заполните заявку на главной странице и оставьте рабочий контакт."],
      [
        "Где смотреть новые видео?",
        "На странице видео публикуются последние ролики и Shorts с YouTube-канала.",
      ],
      [
        "Где скачать материалы?",
        "Откройте страницу материалов и воспользуйтесь поиском и фильтрами.",
      ],
    ],
  },
  "/guides": {
    heading: "Гайды по Minecraft и кооперативным играм",
    sections: [
      [
        "Установка модов и шейдеров",
        "Проверяйте совместимость версии игры и загрузчика Fabric или Forge. Перед установкой сделайте резервную копию мира.",
      ],
      [
        "Выбор сида для выживания",
        "Учитывайте версию Minecraft и проверяйте координаты интересных мест в тестовом мире.",
      ],
      [
        "Подготовка к кооперативной игре",
        "Проверьте микрофон, договоритесь о голосовом чате и используйте только проверенные ссылки.",
      ],
    ],
  },
  "/seeds": {
    heading: "Сиды Minecraft и координаты",
    sections: [
      ["Сиды из роликов", "Ищите опубликованные сиды и скриншоты в разделе материалов."],
      [
        "Как использовать сид",
        "При создании мира откройте дополнительные настройки и вставьте код сида без лишних пробелов.",
      ],
      [
        "Проверяйте версию Minecraft",
        "Один и тот же сид может создавать разные структуры в разных версиях игры.",
      ],
    ],
  },
  "/contacts": {
    heading: "Контакты 0x00 SPACE",
    sections: [
      [
        "Заявка на участие",
        "Используйте форму на главной странице, чтобы отправить заявку на участие в записи.",
      ],
      [
        "Социальные сети",
        "Официальные ссылки на YouTube, Telegram и VK находятся в шапке и подвале сайта.",
      ],
      ["Идея для видео", "Опишите идею в заявке или напишите в официальные сообщения сообщества."],
    ],
  },
  "/privacy": {
    heading: "Политика конфиденциальности",
    sections: [
      [
        "Какие данные используются",
        "Для обработки заявки нужны ник, возраст, контакт, выбранная игра и текст идеи.",
      ],
      [
        "Для чего нужны данные",
        "Данные используются для связи с участником и организации игровых записей.",
      ],
      [
        "Удаление данных",
        "Чтобы запросить удаление заявки, обратитесь через официальные контакты канала.",
      ],
    ],
  },
};

const HOME_PAGE = {
  title: "0x00 SPACE — Minecraft, кооп и хорроры",
  description:
    "0x00 SPACE — игровой канал о Minecraft, кооперативных играх и хоррорах. Видео, гайды, сиды миров и игровые ивенты.",
  heading: "Minecraft, кооп и хорроры на одной частоте",
  intro:
    "Атмосферные прохождения, кооперативные приключения и полезные материалы из роликов. Смотри видео, выбирай игру и присоединяйся к следующему совместному запуску.",
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeVideoThumbnail(video) {
  const fallback = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
  try {
    const url = new URL(video.thumbnail_url || fallback);
    return url.protocol === "https:" && url.hostname.endsWith("ytimg.com") ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function renderVideoLinks(videos, limit) {
  const items = videos.slice(0, limit);
  if (!items.length) return "";
  return `
    <section aria-labelledby="latest-videos-title">
      <h2 id="latest-videos-title">Последние видео 0x00 SPACE</h2>
      <ul>
        ${items
          .map(
            (video) => `
              <li>
                <a href="/videos/${encodeURIComponent(video.video_id)}">
                  <img src="${escapeHtml(safeVideoThumbnail(video))}" alt="" width="160" height="90" loading="lazy" />
                  ${escapeHtml(video.title || "Видео 0x00 SPACE")}
                </a>
                ${video.description ? `<p>${escapeHtml(String(video.description).slice(0, 300))}</p>` : ""}
              </li>`,
          )
          .join("")}
      </ul>
    </section>`;
}

function renderStaticPageBody(page, videos) {
  const content = STATIC_PAGE_CONTENT[page.path] || {};
  const sections = (content.sections || [])
    .map(
      ([heading, text]) => `
        <section>
          <h2>${escapeHtml(heading)}</h2>
          <p>${escapeHtml(text)}</p>
        </section>`,
    )
    .join("");
  const navigation = STATIC_SEO_PAGES.filter((item) => item.path !== page.path)
    .map(
      (item) =>
        `<li><a href="${item.path}">${escapeHtml(item.title.replace(/\s+—\s+0x00 SPACE$/, ""))}</a></li>`,
    )
    .join("");
  const videoList = page.path === "/videos" ? renderVideoLinks(videos, 50) : "";

  return `
    <main id="main-content" class="container-app py-10 sm:py-14">
      <article>
        <h1>${escapeHtml(content.heading || page.title.replace(/\s+—\s+0x00 SPACE$/, ""))}</h1>
        <p>${escapeHtml(page.description)}</p>
        ${sections}
        ${videoList}
        <nav aria-label="Разделы сайта">
          <h2>Разделы сайта</h2>
          <ul>${navigation}</ul>
        </nav>
      </article>
    </main>`;
}

function renderHomePageBody(videos) {
  return `
    <main id="main-content" class="container-app py-10 sm:py-14">
      <article>
        <h1>${escapeHtml(HOME_PAGE.heading)}</h1>
        <p>${escapeHtml(HOME_PAGE.intro)}</p>
        <p><a href="https://youtube.com/@0x00space">Подписаться на YouTube 0x00 SPACE</a></p>
        <nav aria-label="Разделы сайта">
          <h2>Разделы сайта</h2>
          <ul>
            ${STATIC_SEO_PAGES.map((page) => `<li><a href="${page.path}">${escapeHtml(page.title.replace(/\s+—\s+0x00 SPACE$/, ""))}</a></li>`).join("")}
          </ul>
        </nav>
        ${renderVideoLinks(videos, 6)}
      </article>
    </main>`;
}

function renderVideoPageBody(video, videos) {
  const title = video.title || "Видео 0x00 SPACE";
  const thumbnail = safeVideoThumbnail(video);
  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.video_id)}`;
  const description = String(video.description || title).slice(0, 4000);
  return `
    <main id="main-content" class="container-app py-10 sm:py-14">
      <article>
        <p><a href="/videos">Все видео 0x00 SPACE</a></p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description).replace(/\r?\n/g, "<br />")}</p>
        <p><a href="${escapeHtml(youtubeUrl)}">Смотреть видео на YouTube</a></p>
        <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" width="480" height="270" />
      </article>
      <nav aria-label="Другие видео">
        <h2>Другие видео</h2>
        <ul>
          ${videos
            .filter((item) => item.video_id !== video.video_id)
            .slice(0, 10)
            .map(
              (item) =>
                `<li><a href="/videos/${encodeURIComponent(item.video_id)}">${escapeHtml(item.title || "Видео 0x00 SPACE")}</a></li>`,
            )
            .join("")}
        </ul>
      </nav>
    </main>`;
}

function replaceMeta(html, name, content, attribute = "name") {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapedName}")[^>]*>`, "i");
  const tag = `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function replaceCanonical(html, canonical) {
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  const pattern = /<link\b(?=[^>]*\brel="canonical")[^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function renderSeoHtml(
  template,
  { title, description, path, image, type = "website", schema, bodyHtml },
) {
  const canonical = `${siteUrl}${path}`;
  const imageAlt = title.replace(/\s+—\s+0x00 SPACE$/, "");
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, "description", description);
  html = replaceMeta(
    html,
    "robots",
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  );
  html = replaceMeta(html, "og:title", title, "property");
  html = replaceMeta(html, "og:description", description, "property");
  html = replaceMeta(html, "og:type", type, "property");
  html = replaceMeta(html, "og:url", canonical, "property");
  html = replaceMeta(html, "og:image", image, "property");
  html = replaceMeta(html, "og:image:alt", imageAlt, "property");
  if (type === "video.other") {
    html = replaceMeta(html, "og:image:width", "480", "property");
    html = replaceMeta(html, "og:image:height", "360", "property");
  }
  html = replaceMeta(html, "twitter:title", title);
  html = replaceMeta(html, "twitter:description", description);
  html = replaceMeta(html, "twitter:image", image);
  html = replaceMeta(html, "twitter:image:alt", imageAlt);
  html = replaceCanonical(html, canonical);

  if (schema) {
    const jsonLd = JSON.stringify(schema)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
    html = html.replace(
      "</head>",
      `    <script type="application/ld+json" data-seo-prerender="true">${jsonLd}</script>\n  </head>`,
    );
  }
  if (bodyHtml) {
    const root = '<div id="root"></div>';
    if (!html.includes(root)) throw new Error("Не найден контейнер приложения для SEO-разметки.");
    html = html.replace(root, `<div id="root">${bodyHtml}</div>`);
  }
  return html;
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

function staticPageSchema(page) {
  const name = page.title.replace(/\s+—\s+0x00 SPACE$/, "");
  const webPage = {
    "@context": "https://schema.org",
    "@type": page.schemaType,
    name: page.title,
    description: page.description,
    url: `${siteUrl}${page.path}`,
    inLanguage: "ru-RU",
    isPartOf: { "@type": "WebSite", name: "0x00 SPACE", url: `${siteUrl}/` },
  };
  const breadcrumb = breadcrumbSchema([
    { name: "Главная", path: "/" },
    { name, path: page.path },
  ]);
  if (page.path !== "/faq") return [webPage, breadcrumb];

  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        [
          "Как попасть в ролик?",
          "Заполните заявку на главной странице и оставьте рабочий контакт.",
        ],
        [
          "Где смотреть новые видео?",
          "На странице «Видео» публикуются последние ролики и Shorts канала.",
        ],
        [
          "Где скачать материалы?",
          "Откройте страницу «Материалы», воспользуйтесь поиском и фильтрами.",
        ],
      ].map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
    breadcrumb,
  ];
}

function videoSchema(video, path) {
  const videoObject = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title || "Видео 0x00 SPACE",
    description: String(video.description || video.title || "Видео 0x00 SPACE").slice(0, 2048),
    thumbnailUrl: [video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${video.video_id}`,
    url: `${siteUrl}${path}`,
    isFamilyFriendly: true,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}${path}` },
    publisher: {
      "@type": "Organization",
      name: "0x00 SPACE",
      url: `${siteUrl}/`,
      logo: `${siteUrl}/brand-mark.png`,
    },
    ...(video.published_at ? { uploadDate: video.published_at } : {}),
    ...(Number.isInteger(video.duration_seconds) && video.duration_seconds > 0
      ? { duration: `PT${video.duration_seconds}S` }
      : {}),
  };
  return [
    videoObject,
    breadcrumbSchema([
      { name: "Главная", path: "/" },
      { name: "Видео", path: "/videos" },
      { name: video.title || "Видео", path },
    ]),
  ];
}

async function generateStaticSeoPages(outputDir, videos) {
  const template = await readFile(resolve(outputDir, "index.html"), "utf8");
  const homeHtml = renderSeoHtml(template, {
    ...HOME_PAGE,
    path: "/",
    image: `${siteUrl}/brand-logo-transparent.png`,
    bodyHtml: renderHomePageBody(videos),
  });
  await writeFile(resolve(outputDir, "index.html"), homeHtml, "utf8");

  for (const page of STATIC_SEO_PAGES) {
    const outputPath =
      page.path === "/"
        ? resolve(outputDir, "index.html")
        : resolve(outputDir, `${page.path.slice(1)}.html`);
    const html = renderSeoHtml(template, {
      ...page,
      image: `${siteUrl}/brand-logo-transparent.png`,
      schema: staticPageSchema(page),
      bodyHtml: renderStaticPageBody(page, videos),
    });
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
  }

  const adminHtml = renderSeoHtml(template, {
    title: "Админ-панель — 0x00 SPACE",
    description: "Вход в админ-панель 0x00 SPACE.",
    path: "/admin",
    image: `${siteUrl}/brand-logo-transparent.png`,
  });
  await writeFile(
    resolve(outputDir, "admin.html"),
    replaceMeta(adminHtml, "robots", "noindex, nofollow"),
    "utf8",
  );

  const videoDir = resolve(outputDir, "videos");
  await mkdir(videoDir, { recursive: true });
  for (const video of videos) {
    const path = `/videos/${video.video_id}`;
    const title = `${video.title || "Видео"} — 0x00 SPACE`;
    const description = String(
      video.description || video.title || "Видео и игровые истории 0x00 SPACE.",
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    const html = renderSeoHtml(template, {
      title,
      description,
      path,
      image: video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`,
      type: "video.other",
      schema: videoSchema(video, path),
      bodyHtml: renderVideoPageBody(video, videos),
    });
    await writeFile(resolve(videoDir, `${video.video_id}.html`), html, "utf8");
  }
  console.log(
    `[seo] Созданы HTML-head для ${STATIC_SEO_PAGES.length} страниц и ${videos.length} видео.`,
  );
}

function urlEntry(path, priority, changefreq, lastmod) {
  return [
    "  <url>",
    `<loc>${escapeXml(`${siteUrl}${path}`)}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    `<changefreq>${changefreq}</changefreq>`,
    `<priority>${priority}</priority>`,
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

function videoUrlEntry(video) {
  const videoId = encodeURIComponent(video.video_id);
  const pageUrl = `${siteUrl}/videos/${videoId}`;
  const thumbnail = video.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const title = String(video.title || "Видео 0x00 SPACE").slice(0, 100);
  const description = String(video.description || title).slice(0, 2048);
  const publishedAt = video.published_at ? Date.parse(video.published_at) : Number.NaN;
  const publicationDate = Number.isNaN(publishedAt)
    ? ""
    : `<video:publication_date>${new Date(publishedAt).toISOString()}</video:publication_date>`;
  const duration =
    Number.isInteger(video.duration_seconds) && video.duration_seconds > 0
      ? `<video:duration>${video.duration_seconds}</video:duration>`
      : "";

  return [
    "  <url>",
    `<loc>${escapeXml(pageUrl)}</loc>`,
    "<changefreq>monthly</changefreq>",
    "<priority>0.7</priority>",
    "<video:video>",
    `<video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>`,
    `<video:title>${escapeXml(title)}</video:title>`,
    `<video:description>${escapeXml(description)}</video:description>`,
    `<video:player_loc allow_embed="yes">${escapeXml(`https://www.youtube.com/embed/${videoId}`)}</video:player_loc>`,
    publicationDate,
    duration,
    "</video:video>",
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

async function fetchLatestVideos() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/youtube/latest?limit=50`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (attempt === 2) {
        console.warn(`[sitemap] Не удалось получить видео из API: ${error.message}`);
        return [];
      }
      console.warn("[sitemap] API пока не отвечает; повтор через 3 секунды.");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
    }
  }
  return [];
}

async function buildBaseSitemap() {
  try {
    const source = await readFile(resolve(root, "public/sitemap.xml"), "utf8");
    if (source.includes("</urlset>")) {
      return source.replaceAll("https://0x00space.vercel.app", siteUrl);
    }
  } catch {
    // Fall through to generated base sitemap.
  }
  const entries = FALLBACK_ROUTES.map(([path, priority, changefreq]) =>
    urlEntry(path, priority, changefreq),
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  const base = await buildBaseSitemap();
  const videos = await fetchLatestVideos();
  const seen = new Set();
  const indexableVideos = videos.filter((video) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(video?.video_id || "") || seen.has(video.video_id)) {
      return false;
    }
    seen.add(video.video_id);
    return true;
  });
  const videoEntries = indexableVideos.map(videoUrlEntry);

  const withVideoNamespace = base.replace(
    "<urlset ",
    '<urlset xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" ',
  );
  const sitemap = withVideoNamespace.replace("</urlset>", `${videoEntries.join("\n")}\n</urlset>`);
  const outputDir = resolve(root, "dist");
  await mkdir(outputDir, { recursive: true });
  await generateStaticSeoPages(outputDir, indexableVideos);
  await writeFile(resolve(outputDir, "sitemap.xml"), sitemap, "utf8");
  try {
    const robots = await readFile(resolve(root, "public/robots.txt"), "utf8");
    await writeFile(
      resolve(outputDir, "robots.txt"),
      robots.replaceAll("https://0x00space.vercel.app", siteUrl),
      "utf8",
    );
  } catch (error) {
    console.warn(`[sitemap] Не удалось обновить robots.txt: ${error.message}`);
  }
  console.log(`[sitemap] Записано URL видео: ${videoEntries.length}`);
}

main().catch((error) => {
  console.error(`[sitemap] Ошибка: ${error.message}`);
  process.exit(1);
});
