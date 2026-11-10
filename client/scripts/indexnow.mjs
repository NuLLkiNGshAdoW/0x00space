import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const KEY = "5b0af8af5357294799ecb9f01af3e988";
const siteUrl = (process.env.VITE_SITE_URL || "https://0x00space.vercel.app").replace(/\/+$/, "");
const host = new URL(siteUrl).host;
const keyLocation = `${siteUrl}/${KEY}.txt`;
const distSitemap = resolve(process.cwd(), "dist/sitemap.xml");

async function loadSitemap() {
  try {
    return await readFile(distSitemap, "utf8");
  } catch {
    const response = await fetch(`${siteUrl}/sitemap.xml`);
    if (!response.ok) throw new Error(`sitemap.xml вернул HTTP ${response.status}`);
    return response.text();
  }
}

async function main() {
  const keyResponse = await fetch(keyLocation);
  if (!keyResponse.ok) {
    throw new Error(`Ключ IndexNow недоступен по ${keyLocation}; сначала задеплойте сайт.`);
  }
  const publishedKey = (await keyResponse.text()).trim();
  if (publishedKey !== KEY) {
    throw new Error("Файл ключа IndexNow на опубликованном сайте не совпадает с локальным ключом.");
  }

  const sitemap = await loadSitemap();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith(siteUrl));
  if (!urlList.length) throw new Error("В sitemap.xml не найдено URL");

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: KEY, keyLocation, urlList }),
  });

  console.log(`[indexnow] Отправлено URL: ${urlList.length}`);
  console.log(`[indexnow] Ответ: HTTP ${response.status} ${response.statusText}`);
  if (!response.ok && response.status !== 202) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `IndexNow вернул HTTP ${response.status}`);
  }
}

main().catch((error) => {
  console.error(`[indexnow] Ошибка: ${error.message}`);
  process.exit(1);
});
