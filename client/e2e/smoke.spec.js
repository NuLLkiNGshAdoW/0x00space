import { test, expect } from "@playwright/test";

const latestVideo = {
  video_id: "smoke-video",
  title: "Тестовый ролик канала",
  description: "Описание тестового ролика.",
  thumbnail_url: "https://i.ytimg.com/vi/smoke-video/hqdefault.jpg",
  published_at: "2026-01-02T12:00:00Z",
  is_short: false,
  url: "https://www.youtube.com/watch?v=smoke-video",
  duration_seconds: 420,
  view_count: 123,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/youtube/latest")) {
      await route.fulfill({ json: [latestVideo] });
      return;
    }
    if (route.request().method() === "POST" && url.pathname.endsWith("/applications")) {
      await route.fulfill({ status: 201, json: { id: "smoke-application" } });
      return;
    }
    await route.fulfill({ json: [] });
  });
});

test("home renders API-backed hero and latest video CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Minecraft, выживание/ })).toBeVisible();
  await expect(page.getByText(latestVideo.title).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Тестовый ролик канала/ }).first()).toHaveAttribute(
    "href",
    "/videos/smoke-video",
  );
});

test("offline connection status is announced and clears when connectivity returns", async ({ page }) => {
  await page.goto("/");
  await page.context().setOffline(true);
  await expect(page.getByRole("status").getByText(/Нет подключения к интернету/)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByRole("status").getByText(/Нет подключения к интернету/)).toHaveCount(0);
});

test("home uses the optimized decorative background video", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("video.profile-backdrop-local");
  const poster = page.locator('img[src="/assets/minecraft-forest-poster.webp"]');
  await expect(video.or(poster)).toBeVisible();
  if (await video.count()) {
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("muted", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("poster", "/assets/minecraft-forest-poster.webp");
    await expect(video).toHaveAttribute("src", /minecraft-forest-(desktop|mobile)\.webm/);
  }
});

test("desktop background animation toggle actually plays video", async ({ page }) => {
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.goto("/");

  const toggle = page.getByRole("button", { name: /Анимация фона: Включена/ }).first();
  const video = page.locator("video.profile-backdrop-local");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveJSProperty("playsInline", true);
  await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThan(0);

  await toggle.click();
  await expect(
    page.getByRole("button", { name: /Анимация фона: Выключена/ }).first(),
  ).toBeVisible();
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible();

  await page
    .getByRole("button", { name: /Анимация фона: Выключена/ })
    .first()
    .click();
  const enabledVideo = page.locator("video.profile-backdrop-local");
  await expect(enabledVideo).toHaveCount(1);
  await expect
    .poll(() => enabledVideo.evaluate((element) => element.readyState))
    .toBeGreaterThan(0);
  await expect.poll(() => enabledVideo.evaluate((element) => element.paused)).toBe(false);

  await page.reload();
  const reloadedVideo = page.locator("video.profile-backdrop-local");
  await expect(page.getByRole("button", { name: /Анимация фона: Включена/ }).first()).toBeVisible();
  await expect(reloadedVideo).toHaveCount(1);
  await expect.poll(() => reloadedVideo.evaluate((element) => element.paused)).toBe(false);

  await page
    .getByRole("button", { name: /Анимация фона: Включена/ })
    .first()
    .click();
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible();
});

test("reduced motion uses the static background poster", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible();
});

test("mobile starts with a static background until animation is enabled", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible();
  const toggle = page.getByRole("button", { name: "Анимация фона: Выключена" }).last();
  await toggle.click();
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(1);
});

test("background animation preference disables playback and persists", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Анимация фона: Включена/ })
    .first()
    .click();
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("0x00space.background-animation"))).toBe(
    "off",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Анимация фона: Выключена/ }).first(),
  ).toBeVisible();
  await expect(page.locator("video.profile-backdrop-local")).toHaveCount(0);
});

test("background video failure falls back to the poster", async ({ page }) => {
  await page.route("**/assets/minecraft-forest-desktop.webm", (route) => route.abort());
  await page.route("**/assets/minecraft-forest-desktop.mp4", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator('img[src="/assets/minecraft-forest-poster.webp"]')).toBeVisible({
    timeout: 10000,
  });
});

test("background video falls back to MP4 when WebM is unavailable", async ({ page }) => {
  await page.route("**/assets/minecraft-forest-desktop.webm", (route) => route.abort());
  await page.goto("/");
  const video = page.locator("video.profile-backdrop-local");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("src", /minecraft-forest-desktop\.mp4/);
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(false);
});

test("home shows a waking-up state when the API times out", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/youtube/latest")) {
      await route.fulfill({ status: 408, json: { detail: "timeout" } });
      return;
    }
    await route.fallback();
  });
  await page.goto("/");
  await expect(page.getByText(/Сервер просыпается/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
});

test("home distinguishes unavailable materials from an empty catalog", async ({ page }) => {
  await page.route("**/api/resources**", (route) =>
    route.fulfill({ status: 500, json: { detail: "database unavailable" } }),
  );
  await page.goto("/");

  await expect(page.getByText("Сервер вернул ошибку.")).toBeVisible();
  await expect(page.getByText("Материалы появятся после следующего ролика.")).toHaveCount(0);
});

test("navigation opens the video collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Видео", exact: true }).first().click();
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Видео 0x00 SPACE" })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Последние ролики" })).toBeVisible();
});

test("background configuration is reused during public navigation", async ({ page }) => {
  let backgroundsRequests = 0;
  await page.route("**/api/backgrounds", (route) => {
    backgroundsRequests += 1;
    return route.fulfill({ json: { items: [], active: null, settings: {} } });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "FAQ", exact: true }).first().click();
  await expect(page).toHaveURL(/\/faq$/);
  await page.getByRole("link", { name: "Видео", exact: true }).first().click();
  await expect(page).toHaveURL(/\/videos$/);
  expect(backgroundsRequests).toBe(1);
});

test("materials collection has a single accessible page heading", async ({ page }) => {
  await page.goto("/materials");
  await expect(
    page.getByRole("heading", { level: 1, name: "Материалы и сиды Minecraft" }),
  ).toBeAttached();
});

test("events page exposes canonical URL and breadcrumb structured data", async ({ page }) => {
  await page.goto("/events");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://0x00space.vercel.app/events",
  );
  const jsonLd = await page.locator('script[data-seo-jsonld="true"]').textContent();
  expect(JSON.parse(jsonLd)).toEqual(
    expect.arrayContaining([expect.objectContaining({ "@type": "BreadcrumbList" })]),
  );
});

test("video search is debounced and reflected in the URL", async ({ page }) => {
  await page.goto("/videos");
  const search = page.getByLabel("Поиск по видео");
  await search.fill("неизвестный ролик");
  await expect(page).toHaveURL(/video_q=/);
  await expect(page.getByText("Ничего не найдено")).toBeVisible();
});

test("video cards handle an unavailable thumbnail", async ({ page }) => {
  await page.route("**/i.ytimg.com/**", (route) => route.abort());
  await page.goto("/videos");

  await expect(page.getByText("Превью недоступно")).toBeVisible();
});

test("material cards keep long titles and missing covers usable on mobile", async ({ page }) => {
  const title =
    "Большой атмосферный модпак для долгого совместного выживания в необычном мире Minecraft";
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route(/\/resources(?:\?|$)/, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: 7,
            title,
            description: "Подборка материалов для длинного прохождения вместе с друзьями.",
            resource_type: "modpack",
            game_category: "minecraft",
            game_version: "1.21",
            cover_image_url: null,
            download_url: "https://example.com/download",
          },
        ],
        has_next: false,
      },
    }),
  );
  await page.goto("/materials");

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".resource-card .media-fallback")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 375);
});

test("mobile menu exposes navigation and closes after selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Открыть меню" });
  await menuButton.click();
  await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Мобильная навигация" })
    .getByRole("link", { name: "FAQ" })
    .click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeVisible();
});

test("mobile quick navigation is thumb-friendly and stays clear of Telegram", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const quickNavigation = page.getByRole("navigation", { name: "Быстрая навигация" });
  await expect(quickNavigation).toBeVisible();
  await quickNavigation.getByRole("link", { name: "Материалы" }).click();
  await expect(page).toHaveURL(/\/materials$/);
  await expect(page.getByRole("heading", { name: "Материалы и миры" })).toBeVisible();
  await expect(page.getByText("В этой категории пока нет материалов")).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 500));
  const telegram = page.getByRole("link", { name: "Открыть Telegram-канал 0x00 SPACE" });
  await expect(telegram).toBeVisible();
  const telegramBox = await telegram.boundingBox();
  const navigationBox = await quickNavigation.boundingBox();
  expect(telegramBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(telegramBox.y + telegramBox.height).toBeLessThan(navigationBox.y);
});

test("brand asset remains usable at the minimum supported width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const heroLogo = page.locator('img[src="/brand-logo-transparent.png"]');
  await expect(heroLogo).toHaveAttribute("width", "1200");
  await expect(heroLogo).toHaveAttribute("height", "675");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
});

test("public home stays within the supported responsive widths", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
  }
});

test("mobile game keeps touch controls thumb-sized and supports fullscreen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/game");

  const controls = page.locator(".game-mobile-pad");
  await expect(controls).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  for (const button of await controls.locator("button").all()) {
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const game = page.locator(".game-shell");
  await page.getByRole("button", { name: "На весь экран" }).click();
  await expect.poll(() => game.evaluate((element) => document.fullscreenElement === element)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Выйти из полноэкранного режима" }).click();
  await expect.poll(() => game.evaluate((element) => document.fullscreenElement === element)).toBe(
    false,
  );
});

test("game restores pilot records saved in the browser", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "space-runner-records",
      JSON.stringify([
        { score: 851, difficulty: "ace", playedAt: "2026-11-10T12:00:00.000Z" },
        { score: 420, difficulty: "standard", playedAt: "2026-11-09T12:00:00.000Z" },
      ]),
    );
  });
  await page.goto("/game");

  const records = page.locator(".game-record-list");
  await expect(records.locator("li")).toHaveCount(2);
  await expect(records.locator("li").first()).toContainText("851");
  await expect(records.locator("li").first()).toContainText("Айс");
  await page.reload();
  await expect(page.locator(".game-record-list li").first()).toContainText("851");
});

test("video and material catalogs stay within supported viewport widths", async ({ page }) => {
  for (const path of ["/videos", "/materials"]) {
    await page.goto(path);
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
    }
  }
});

test("navbar keeps branding and navigation separated across breakpoints", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("header");
  const brand = header.locator(".navbar-brand");
  const desktopNavigation = header.getByRole("navigation", { name: "Основная навигация" });
  const animationToggle = page
    .locator('footer[aria-label="Подвал сайта"]')
    .getByRole("button", { name: /Анимация фона:/ });

  for (const width of [1024, 1280, 1440, 1536, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(desktopNavigation).toBeVisible();
    await expect(header.getByRole("button", { name: /Анимация фона:/ })).toHaveCount(0);
    await expect(animationToggle).toBeVisible();
    await expect(brand).toHaveAttribute("href", "/");
    await expect(
      desktopNavigation.getByRole("link", { name: "Главная", exact: true }),
    ).toHaveAttribute("href", "/");
    const brandBox = await brand.boundingBox();
    const homeBox = await desktopNavigation
      .getByRole("link", { name: "Главная", exact: true })
      .boundingBox();
    expect(brandBox).not.toBeNull();
    expect(homeBox).not.toBeNull();
    expect(homeBox.x).toBeGreaterThan(brandBox.x + brandBox.width);
    expect(await desktopNavigation.evaluate((nav) => nav.scrollWidth <= nav.clientWidth)).toBe(
      true,
    );
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
  }

  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(desktopNavigation).toBeHidden();
    await expect(header.getByRole("button", { name: "Открыть меню" })).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
  }
});

test("secondary copy remains opaque and readable over the backdrop", async ({ page }) => {
  await page.goto("/");
  const copy = page.locator("#community-title").locator("..").locator("p.text-readable");
  await expect(copy).toHaveCSS("opacity", "1");
  await expect(copy).toHaveCSS("color", "rgb(226, 232, 240)");
});

test("application form validates and submits", async ({ page }) => {
  await page.addInitScript(() => {
    window.__trackingEvents = [];
    window.gtag = (...event) => window.__trackingEvents.push(event);
  });
  await page.goto("/");
  const form = page.locator("#application");
  await form.getByLabel("Игровой ник / имя").fill("Alex");
  await form.getByLabel("Контакт (Discord или Telegram)").fill("@alex");
  await form.getByLabel("Возраст").fill("18");
  await form.getByLabel("Идея для видео / сообщение").fill("Сыграть совместный хоррор.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(form.getByRole("status")).toContainText("Заявка отправлена");
  const events = await page.evaluate(() => window.__trackingEvents);
  expect(events.filter(([, name]) => name === "application_start")).toHaveLength(1);
  expect(events.find(([, name]) => name === "application_start")).toEqual([
    "event",
    "application_start",
    { source: "application_form" },
  ]);
  expect(events.some(([, name]) => name === "application_submit")).toBe(true);
});

test("application form explains missing privacy consent", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#application");
  await form.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(form.getByText("Подтвердите согласие на обработку данных")).toBeVisible();
});

test("unknown route exposes a keyboard reachable 404", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Кажется, мы улетели не на ту планету." })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Смотреть видео/ })).toHaveAttribute("href", "/videos");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("lazy chunk failure shows a route fallback instead of a blank page", async ({ page }) => {
  await page.goto("/");
  await page.route("**/src/pages/AdminPage.jsx", (route) => route.abort());
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Раздел временно недоступен" })).toBeVisible();
});
