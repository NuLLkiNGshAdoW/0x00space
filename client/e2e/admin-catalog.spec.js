import { expect, test } from "@playwright/test";

function adminPage(records, request, searchableFields) {
  const url = new URL(request.url());
  const archive = url.searchParams.get("archive") || "active";
  const search = (url.searchParams.get("search") || "").toLocaleLowerCase();
  const filtered = records.filter((item) => {
    const isArchived = Boolean(item.archived_at);
    if (archive === "active" && isArchived) return false;
    if (archive === "archived" && !isArchived) return false;
    return (
      !search || searchableFields.some((field) => item[field]?.toLocaleLowerCase().includes(search))
    );
  });
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 8);
  const start = (page - 1) * limit;
  return {
    items: filtered.slice(start, start + limit),
    page,
    limit,
    total: filtered.length,
    has_next: filtered.length > start + limit,
  };
}

test("admin creates, edits, archives and restores materials and Minecraft seeds", async ({
  page,
}) => {
  let resources = [];
  let seeds = [];

  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.route("**/api/youtube/latest**", (route) => route.fulfill({ json: [
    {
      video_id: "dQw4w9WgXcQ",
      title: "Тестовый ролик для связи",
      description: "Видео для материала",
      thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      published_at: "2026-01-02T12:00:00Z",
      is_short: false,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration_seconds: 120,
      view_count: 1,
    },
    {
      video_id: "abcdefghijk",
      title: "Видео с интересным сидом",
      description: "Видео для мира",
      thumbnail_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
      published_at: "2026-01-01T12:00:00Z",
      is_short: false,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      duration_seconds: 120,
      view_count: 1,
    },
  ] }));
  await page.route(/\/api\/admin\/resources(?:\/[^?]*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({ json: adminPage(resources, request, ["title", "game_version"]) });
    }
    if (request.method() === "POST" && request.url().endsWith("/restore")) {
      resources = [{ ...resources[0], archived_at: null }];
      return route.fulfill({ json: resources[0] });
    }
    if (request.method() === "POST") {
      const payload = request.postDataJSON();
      const resource = { ...payload, id: "resource-1", created_at: "2026-01-01T00:00:00" };
      resources = [resource];
      return route.fulfill({ status: 201, json: resource });
    }
    if (request.method() === "PUT") {
      const payload = request.postDataJSON();
      resources = [{ ...resources[0], ...payload }];
      return route.fulfill({ json: resources[0] });
    }
    if (request.method() === "DELETE") {
      resources = [{ ...resources[0], archived_at: "2026-01-02T00:00:00" }];
      return route.fulfill({ status: 204, body: "" });
    }
  });
  await page.route(/\/api\/admin\/seeds(?:\/[^?]*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: adminPage(seeds, request, ["title", "seed_code", "minecraft_version"]),
      });
    }
    if (request.method() === "POST" && request.url().endsWith("/restore")) {
      seeds = [{ ...seeds[0], archived_at: null }];
      return route.fulfill({ json: seeds[0] });
    }
    if (request.method() === "POST") {
      const payload = request.postDataJSON();
      const seed = { ...payload, id: "seed-1", created_at: "2026-01-01T00:00:00" };
      seeds = [seed];
      return route.fulfill({ status: 201, json: seed });
    }
    if (request.method() === "PUT") {
      const payload = request.postDataJSON();
      seeds = [{ ...seeds[0], ...payload }];
      return route.fulfill({ json: seeds[0] });
    }
    if (request.method() === "DELETE") {
      seeds = [{ ...seeds[0], archived_at: "2026-01-02T00:00:00" }];
      return route.fulfill({ status: 204, body: "" });
    }
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Каталог материалов и сидов" })).toBeVisible();
  const catalog = page.getByRole("region", { name: "Каталог материалов и сидов" });
  await page.getByLabel("Название").first().fill("Тестовый мод");
  await page.getByLabel("Ссылка для скачивания").fill("https://example.test/mod.zip");
  await page.getByRole("button", { name: "Связать видео Тестовый ролик для связи" }).click();
  await catalog.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  const resourcePreview = page.getByRole("dialog", { name: "Предпросмотр материала" });
  await expect(resourcePreview.getByText("Тестовый мод")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(resourcePreview).toBeHidden();
  await expect(catalog.getByRole("button", { name: "Предпросмотр", exact: true })).toBeFocused();
  await catalog.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(resourcePreview).toBeVisible();
  await resourcePreview.getByRole("button", { name: "Опубликовать" }).click();
  await expect(page.getByText("Материал сохранён")).toBeVisible();
  expect(resources[0].related_video_ids).toEqual(["dQw4w9WgXcQ"]);
  await expect(page.getByText("Тестовый мод")).toBeVisible();

  await page.getByRole("button", { name: "Изменить: Тестовый мод" }).click();
  await page.getByLabel("Название").first().fill("Обновлённый мод");
  await catalog.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  const updatedResourcePreview = page.getByRole("dialog", { name: "Предпросмотр материала" });
  await expect(updatedResourcePreview.getByText("Обновлённый мод")).toBeVisible();
  await updatedResourcePreview.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("Обновлённый мод")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "В архив: Обновлённый мод" }).click();
  await expect(page.getByText("Материал перемещён в архив")).toBeVisible();
  await catalog.getByLabel("Фильтр архива").selectOption("archived");
  await page.getByRole("button", { name: "Восстановить: Обновлённый мод" }).click();
  await expect(page.getByText("Материал восстановлен")).toBeVisible();
  await catalog.getByLabel("Фильтр архива").selectOption("active");

  await page.getByRole("tab", { name: "Сиды миров" }).click();
  await page.getByLabel("Название").first().fill("Тестовый мир");
  await page.getByLabel("Код сида").fill("12345");
  await page.getByLabel("Версия Minecraft").fill("1.21.1");
  await page.getByRole("button", { name: "Связать видео Видео с интересным сидом" }).click();
  await catalog.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  const seedPreview = page.getByRole("dialog", { name: "Предпросмотр сида" });
  await expect(seedPreview.getByText("Тестовый мир")).toBeVisible();
  await seedPreview.getByRole("button", { name: "Опубликовать" }).click();
  await expect(page.getByText("Сид сохранён")).toBeVisible();
  expect(seeds[0].related_video_ids).toEqual(["abcdefghijk"]);
  await expect(page.getByText("Тестовый мир")).toBeVisible();

  await page.getByRole("button", { name: "В архив: Тестовый мир" }).click();
  await expect(page.getByText("Сид перемещён в архив")).toBeVisible();
  await catalog.getByLabel("Фильтр архива").selectOption("archived");
  await expect(page.getByText("В архиве · Minecraft 1.21.1 · сид 12345")).toBeVisible();
  await page.getByRole("button", { name: "Восстановить: Тестовый мир" }).click();
  await expect(page.getByText("Сид восстановлен")).toBeVisible();
  await catalog.getByLabel("Фильтр архива").selectOption("active");
  await expect(page.getByText("Тестовый мир")).toBeVisible();
});

test("admin manages gaming events and registration status", async ({ page }) => {
  let events = [];
  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.route(/\/api\/admin\/resources(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { items: [], page: 1, limit: 8, total: 0, has_next: false } }),
  );
  await page.route(/\/api\/admin\/seeds(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { items: [], page: 1, limit: 8, total: 0, has_next: false } }),
  );
  await page.route(/\/api\/admin\/events(?:\/[^?]*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: adminPage(events, request, ["title", "description", "game"]),
      });
    }
    if (request.method() === "POST" && request.url().endsWith("/restore")) {
      events = [{ ...events[0], archived_at: null }];
      return route.fulfill({ json: events[0] });
    }
    if (request.method() === "POST") {
      const payload = request.postDataJSON();
      const event = { ...payload, id: "event-1", created_at: "2026-01-01T00:00:00" };
      events = [event];
      return route.fulfill({ status: 201, json: event });
    }
    if (request.method() === "PUT") {
      events = [{ ...events[0], ...request.postDataJSON() }];
      return route.fulfill({ json: events[0] });
    }
    if (request.method() === "DELETE") {
      events = [{ ...events[0], archived_at: "2026-01-02T00:00:00" }];
      return route.fulfill({ status: 204, body: "" });
    }
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Игровые события" })).toBeVisible();
  const adminEvents = page.getByRole("region", { name: "Игровые события" });
  await page.getByLabel("Название").nth(1).fill("Кооп вечер");
  await page.getByRole("textbox", { name: "Игра" }).fill("Minecraft");
  await page.getByLabel("Дата и время").fill("2030-02-03T18:30");
  await page.getByLabel("Описание").last().fill("Играем вместе на сервере.");
  await page.getByRole("button", { name: "Предпросмотр события" }).click();
  const eventPreview = page.getByRole("dialog", { name: "Предпросмотр события" });
  await expect(eventPreview.getByText("Кооп вечер")).toBeVisible();
  await eventPreview.getByRole("button", { name: "Опубликовать" }).click();
  await expect(page.getByText("Событие сохранено")).toBeVisible();
  await expect(page.getByText("Кооп вечер")).toBeVisible();

  await page.getByRole("button", { name: "Изменить: Кооп вечер" }).click();
  await adminEvents.getByLabel("Статус").selectOption("completed");
  await page.getByRole("button", { name: "Предпросмотр события" }).click();
  await page
    .getByRole("dialog", { name: "Предпросмотр события" })
    .getByRole("button", { name: "Сохранить изменения" })
    .click();
  await expect(page.getByText("Minecraft · Завершено · заявок 0")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "В архив: Кооп вечер" }).click();
  await expect(page.getByText("Событие перемещено в архив")).toBeVisible();
  await adminEvents.getByLabel("Фильтр архива").selectOption("archived");
  await expect(page.getByText(/В архиве/)).toBeVisible();
  await page.getByRole("button", { name: "Восстановить: Кооп вечер" }).click();
  await expect(page.getByText("Событие восстановлено")).toBeVisible();
  await adminEvents.getByLabel("Фильтр архива").selectOption("active");
  await expect(page.getByText("Кооп вечер")).toBeVisible();
});

test("admin catalog search, archive filter and pagination narrow the result list", async ({
  page,
}) => {
  const resources = Array.from({ length: 10 }, (_, index) => ({
    id: `resource-${index + 1}`,
    title: `Материал ${index + 1}`,
    resource_type: "mod",
    game_category: "minecraft",
    game_version: "1.21",
    description: "Поиск по каталогу",
    download_url: `https://example.test/${index + 1}`,
    archived_at: index === 9 ? "2026-01-02T00:00:00" : null,
  }));
  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.route(/\/api\/admin\/resources(?:\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const archive = url.searchParams.get("archive") || "active";
    const search = (url.searchParams.get("search") || "").toLocaleLowerCase();
    const filtered = resources.filter((item) => {
      if (archive === "active" && item.archived_at) return false;
      if (archive === "archived" && !item.archived_at) return false;
      return !search || item.title.toLocaleLowerCase().includes(search);
    });
    const pageNumber = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 8);
    const offset = (pageNumber - 1) * limit;
    return route.fulfill({
      json: {
        items: filtered.slice(offset, offset + limit),
        page: pageNumber,
        limit,
        total: filtered.length,
        has_next: filtered.length > offset + limit,
      },
    });
  });
  await page.route(/\/api\/admin\/seeds(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { items: [], page: 1, limit: 8, total: 0, has_next: false } }),
  );
  await page.route(/\/api\/admin\/events(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { items: [], page: 1, limit: 8, total: 0, has_next: false } }),
  );

  await page.goto("/admin");
  const catalog = page.getByRole("region", { name: "Каталог материалов и сидов" });
  await expect(catalog.getByText("Материал 1")).toBeVisible();
  await expect(catalog.getByText("Материал 9")).toHaveCount(0);
  await catalog
    .getByRole("navigation", { name: "Страницы списка" })
    .getByRole("button", { name: "Далее" })
    .click();
  await expect(catalog.getByText("Материал 9")).toBeVisible();

  await catalog.getByLabel("Поиск в списке").fill("Материал 3");
  await expect(catalog.getByText("Материал 3")).toBeVisible();
  await expect(catalog.getByText("Материал 9")).toHaveCount(0);
  await catalog.getByLabel("Поиск в списке").fill("");
  await catalog.getByLabel("Фильтр архива").selectOption("archived");
  await expect(catalog.getByText("Материал 10")).toBeVisible();
});
