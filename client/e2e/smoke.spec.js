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

test("navigation opens the video collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Видео", exact: true }).first().click();
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByRole("heading", { name: "Последние ролики" })).toBeVisible();
});

test("mobile menu exposes navigation and closes after selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Открыть меню" });
  await menuButton.click();
  await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
  await page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeVisible();
});

test("application form validates and submits", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#application");
  await form.getByLabel("Игровой ник / имя").fill("Alex");
  await form.getByLabel("Контакт (Discord или Telegram)").fill("@alex");
  await form.getByLabel("Возраст").fill("18");
  await form.getByLabel("Идея для видео / сообщение").fill("Сыграть совместный хоррор.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(form.getByRole("status")).toContainText("Заявка отправлена");
});
