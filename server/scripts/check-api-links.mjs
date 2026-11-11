import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_API_BASE_URL = "https://zerox00space-api.onrender.com/api";
const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_SIZE = 50;
const MAX_PAGES = 200;
const LINK_CONCURRENCY = 5;

export async function checkApi({
  apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL,
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  const issues = [];
  let health;

  try {
    const response = await fetchImpl(`${baseUrl}/health`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    health = await response.json();
    if (!response.ok || health?.status !== "ok") {
      issues.push(`API health is ${health?.status || `HTTP ${response.status}`}`);
    }
  } catch (error) {
    issues.push(`API health request failed: ${error.message}`);
  }

  if (issues.length) {
    log(`FAIL ${issues[0]}`);
    await writeSummary({ health, checked: 0, issues });
    return { health, checked: 0, issues };
  }
  log(`PASS API health: ${health.status}`);

  let resources;
  try {
    resources = await fetchResources(baseUrl, fetchImpl);
  } catch (error) {
    issues.push(`Resource catalog request failed: ${error.message}`);
    log(`FAIL ${issues.at(-1)}`);
    await writeSummary({ health, checked: 0, issues });
    return { health, checked: 0, issues };
  }

  const uniqueLinks = new Map();
  for (const resource of resources) {
    const value = resource?.download_url;
    if (typeof value !== "string" || !isHttpUrl(value)) {
      issues.push(`${resource?.title || resource?.id || "Untitled resource"}: invalid download URL`);
      continue;
    }
    uniqueLinks.set(value, resource?.title || resource?.id || value);
  }

  const links = [...uniqueLinks.entries()];
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(LINK_CONCURRENCY, links.length) },
    async () => {
      while (nextIndex < links.length) {
        const [url, title] = links[nextIndex];
        nextIndex += 1;
        const result = await checkLink(url, fetchImpl);
        if (!result.ok) issues.push(`${title}: ${result.error}`);
      }
    },
  );
  await Promise.all(workers);

  for (const issue of issues) log(`FAIL ${issue}`);
  if (!issues.length) log(`PASS ${resources.length} materials, ${links.length} unique download links`);
  await writeSummary({ health, checked: links.length, issues });
  return { health, checked: links.length, issues };
}

async function fetchResources(baseUrl, fetchImpl) {
  const resources = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(`${baseUrl}/resources`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_SIZE));
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (!Array.isArray(payload?.items)) throw new Error("Invalid resource catalog response");
    resources.push(...payload.items);
    if (!payload.has_next) return resources;
  }
  throw new Error(`Catalog exceeded the safety limit of ${MAX_PAGES} pages`);
}

async function checkLink(value, fetchImpl) {
  let headError;
  try {
    const response = await fetchImpl(value, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true };
    headError = `HTTP ${response.status} on HEAD`;
    await response.body?.cancel();
  } catch (error) {
    headError = error.message;
  }

  try {
    const response = await fetchImpl(value, {
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const result = response.ok
      ? { ok: true }
      : { ok: false, error: `HTTP ${response.status} (HEAD: ${headError})` };
    await response.body?.cancel();
    return result;
  } catch (error) {
    return { ok: false, error: `${error.message} (HEAD: ${headError})` };
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function writeSummary({ health, checked, issues }) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const lines = [
    "## API and resource link check",
    `- API health: **${health?.status || "unavailable"}**`,
    `- Unique download links checked: **${checked}**`,
    `- Issues: **${issues.length}**`,
    ...issues.map((issue) => `- ${issue}`),
    "",
  ];
  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkApi()
    .then(({ issues }) => {
      if (issues.length) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
