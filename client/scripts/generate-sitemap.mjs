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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
  const videoEntries = videos
    .filter((video) => {
      if (!video?.video_id || seen.has(video.video_id)) return false;
      seen.add(video.video_id);
      return true;
    })
    .map(videoUrlEntry);

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
