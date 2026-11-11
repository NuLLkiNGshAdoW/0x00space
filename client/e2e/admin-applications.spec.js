import { expect, test } from "@playwright/test";

test("admin searches applications and updates their review status", async ({ page }) => {
  let applications = [
    {
      id: "application-alex",
      nickname: "Alex",
      age: 18,
      contact: "@alex",
      game: "Minecraft",
      video_idea: "Совместное выживание в горах.",
      mic_or_experience_link: null,
      status: "new",
      telegram_notified: true,
      created_at: "2026-05-01T12:00:00Z",
    },
    {
      id: "application-mira",
      nickname: "Mira",
      age: 20,
      contact: "@mira",
      game: "Phasmophobia",
      video_idea: "Записать кооперативный хоррор.",
      mic_or_experience_link: null,
      status: "new",
      telegram_notified: false,
      created_at: "2026-05-02T12:00:00Z",
    },
  ];

  await page.route("**/api/auth/check", (route) => route.fulfill({ json: { authenticated: true } }));
  await page.route("**/api/backgrounds", (route) => route.fulfill({ json: { items: [], active: null, settings: {} } }));
  await page.route(/\/api\/admin\/(resources|seeds|events)(?:\?.*)?$/, (route) => route.fulfill({
    json: { items: [], page: 1, limit: 8, total: 0, has_next: false },
  }));
  await page.route(/\/api\/applications\/admin(?:\/[^?]+)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "PATCH") {
      const id = url.pathname.split("/").at(-2);
      const { status } = request.postDataJSON();
      applications = applications.map((application) => application.id === id ? { ...application, status } : application);
      return route.fulfill({ json: applications.find((application) => application.id === id) });
    }
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = url.searchParams.get("status");
    const filtered = applications.filter((application) => {
      const text = `${application.nickname} ${application.contact} ${application.game} ${application.video_idea}`.toLowerCase();
      return (!search || text.includes(search)) && (!status || application.status === status);
    });
    const pageNumber = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 10);
    const start = (pageNumber - 1) * limit;
    return route.fulfill({ json: {
      items: filtered.slice(start, start + limit),
      page: pageNumber,
      limit,
      total: filtered.length,
      has_next: filtered.length > start + limit,
    } });
  });

  await page.goto("/admin");
  const inbox = page.getByRole("region", { name: "Заявки участников" });
  await expect(inbox.getByRole("heading", { name: "Alex" })).toBeVisible();
  await expect(inbox.getByRole("heading", { name: "Mira" })).toBeVisible();
  await inbox.getByLabel("Поиск заявок").fill("alex");
  await expect(inbox.getByRole("heading", { name: "Mira" })).toHaveCount(0);
  await expect(inbox.getByRole("heading", { name: "Alex" })).toBeVisible();

  await inbox.getByRole("button", { name: "Одобрить" }).click();
  await expect(inbox.getByRole("listitem").getByText("Одобрена")).toBeVisible();
  await inbox.getByLabel("Фильтр статуса заявки").selectOption("approved");
  await expect(inbox.getByRole("heading", { name: "Alex" })).toBeVisible();
  await inbox.getByLabel("Фильтр статуса заявки").selectOption("rejected");
  await expect(inbox.getByRole("heading", { name: "Alex" })).toHaveCount(0);
});
