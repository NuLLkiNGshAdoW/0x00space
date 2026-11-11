import { test, expect } from "@playwright/test";

const video = {
  video_id: "abcdefghijk",
  title: "Тестовый detail ролик",
  description: "Описание из detail endpoint.",
  thumbnail_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
  published_at: "2026-01-02T12:00:00Z",
  is_short: false,
  url: "https://www.youtube.com/watch?v=abcdefghijk",
  duration_seconds: 120,
  view_count: 10,
};

test("video detail uses detail endpoint and renders related videos", async ({ page }) => {
  await page.route("**/api/youtube/abcdefghijk", (route) =>
    route.fulfill({ json: { video, related: [] } }),
  );
  await page.goto("/videos/abcdefghijk");
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  await expect(page.getByText(video.description)).toBeVisible();
});

test("video detail displays catalog entries explicitly linked to that video", async ({ page }) => {
  await page.route("**/api/youtube/abcdefghijk", (route) =>
    route.fulfill({ json: { video, related: [] } }),
  );
  await page.route(/\/api\/resources\?.*video_id=abcdefghijk/, (route) => route.fulfill({
    json: {
      items: [{
        id: "linked-resource",
        title: "Мод из этого выпуска",
        description: "Материал вручную привязан к ролику.",
        resource_type: "mod",
        game_category: "minecraft",
        game_version: "1.21",
        download_url: "https://example.test/mod.zip",
        cover_image_url: null,
        related_video_ids: ["abcdefghijk"],
      }],
      has_next: false,
    },
  }));
  await page.route(/\/api\/seeds\?.*video_id=abcdefghijk/, (route) => route.fulfill({
    json: { items: [], has_next: false },
  }));

  await page.goto("/videos/abcdefghijk");

  const recommendations = page.getByRole("region", { name: "Материалы к этому видео" });
  await expect(recommendations.getByRole("heading", { name: "Мод из этого выпуска" })).toBeVisible();
});

test("video detail shows a not found state", async ({ page }) => {
  await page.route("**/api/youtube/not-found-id", (route) =>
    route.fulfill({ status: 404, json: { detail: "Видео не найдено" } }),
  );
  await page.goto("/videos/not-found-id");
  await expect(page.getByRole("heading", { name: "Видео не найдено" })).toBeVisible();
});

test("video detail retry repeats a failed API request", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/youtube/retry-video", (route) => {
    calls += 1;
    if (calls === 1) return route.fulfill({ status: 500, json: { detail: "temporary error" } });
    return route.fulfill({ json: { video, related: [] } });
  });
  await page.goto("/videos/retry-video");
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  expect(calls).toBe(2);
});

test("admin login does not persist the password in localStorage", async ({ page }) => {
  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ status: 401, json: { detail: "Нужна авторизация администратора." } }),
  );
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.goto("/admin");
  await page.getByLabel("Пароль администратора").fill("test-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Вход выполнен")).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("admin logout clears the authenticated UI", async ({ page }) => {
  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ status: 401, json: { detail: "Не авторизован" } }),
  );
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.goto("/admin");
  await page.getByLabel("Пароль администратора").fill("test-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.getByRole("button", { name: /Выйти/ }).click();
  await expect(page.getByText("Сессия завершена")).toBeVisible();
});

test("video detail remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/youtube/mobile-video", (route) =>
    route.fulfill({ json: { video, related: [] } }),
  );
  await page.goto("/videos/mobile-video");
  await expect(page.getByRole("heading", { name: video.title })).toBeVisible();
  await expect(page.getByRole("link", { name: /Все видео/ })).toBeVisible();
});
