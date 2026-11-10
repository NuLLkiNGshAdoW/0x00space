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

function renderSeoHtml(template, { title, description, path, image, type = "website", schema }) {
  const canonical = `${siteUrl}${path}`;
  const imageAlt = title.replace(/\s+—\s+0x00 SPACE$/, "");
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, "description", description);
  html = replaceMeta(html, "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
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
        ["Как попасть в ролик?", "Заполните заявку на главной странице и оставьте рабочий контакт."],
        ["Где смотреть новые видео?", "На странице «Видео» публикуются последние ролики и Shorts канала."],
        ["Где скачать материалы?", "Откройте страницу «Материалы», воспользуйтесь поиском и фильтрами."],
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
  for (const page of STATIC_SEO_PAGES) {
    const outputPath = page.path === "/"
      ? resolve(outputDir, "index.html")
      : resolve(outputDir, `${page.path.slice(1)}.html`);
    const html = renderSeoHtml(template, {
      ...page,
      image: `${siteUrl}/brand-logo-transparent.png`,
      schema: staticPageSchema(page),
    });
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
  }

  const videoDir = resolve(outputDir, "videos");
  await mkdir(videoDir, { recursive: true });
  for (const video of videos) {
    const path = `/videos/${video.video_id}`;
    const title = `${video.title || "Видео"} — 0x00 SPACE`;
    const description = String(video.description || video.title || "Видео и игровые истории 0x00 SPACE.")
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
    });
    await writeFile(resolve(videoDir, `${video.video_id}.html`), html, "utf8");
  }
  console.log(`[seo] Созданы HTML-head для ${STATIC_SEO_PAGES.length} страниц и ${videos.length} видео.`);
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
  const duration = Number.isInteger(video.duration_seconds) && video.duration_seconds > 0
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
  const indexableVideos = videos
    .filter((video) => {
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
  const sitemap = withVideoNamespace.replace(
    "</urlset>",
    `${videoEntries.join("\n")}\n</urlset>`,
  );
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
