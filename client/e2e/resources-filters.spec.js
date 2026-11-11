import { expect, test } from "@playwright/test";

const resources = [
  {
    id: "mod-121",
    title: "Мод для версии 1.21",
    description: "Тестовый мод",
    resource_type: "mod",
    game_category: "minecraft",
    game_version: "1.21",
    download_url: "https://example.com/mod",
  },
  {
    id: "shader-120",
    title: "Шейдер для версии 1.20.4",
    description: "Тестовый шейдер",
    resource_type: "shader",
    game_category: "minecraft",
    game_version: "1.20.4",
    download_url: "javascript:alert(1)",
  },
];

test("materials filter by type and Minecraft version and preserve filters in URL", async ({
  page,
}) => {
  await page.route("**/api/resources/filters", (route) =>
    route.fulfill({
      json: { resource_types: ["mod", "shader"], game_versions: ["1.20.4", "1.21"] },
    }),
  );
  await page.route(/\/api\/resources(?:\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const filtered = resources.filter(
      (resource) =>
        (!url.searchParams.has("resource_type") ||
          resource.resource_type === url.searchParams.get("resource_type")) &&
        (!url.searchParams.has("game_version") ||
          resource.game_version === url.searchParams.get("game_version")),
    );
    return route.fulfill({ json: { items: filtered, page: 1, limit: 8, has_next: false } });
  });

  await page.goto("/materials");
  await page.getByLabel("Тип материала").selectOption("mod");
  await page.getByLabel("Версия Minecraft").selectOption("1.21");

  await expect(page).toHaveURL(/resource_type=mod/);
  await expect(page).toHaveURL(/resource_version=1.21/);
  await expect(page.getByRole("heading", { name: "Мод для версии 1.21" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Шейдер для версии 1.20.4" })).toHaveCount(0);
});

test("invalid download URLs are shown as unavailable instead of becoming links", async ({
  page,
}) => {
  await page.route("**/api/resources/filters", (route) =>
    route.fulfill({ json: { resource_types: ["shader"], game_versions: ["1.20.4"] } }),
  );
  await page.route(/\/api\/resources(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [resources[1]],
        page: 1,
        limit: 8,
        has_next: false,
      },
    }),
  );

  await page.goto("/materials");
  await expect(page.getByText("Ссылка временно недоступна")).toBeVisible();
  await expect(page.locator('.resource-card a[href^="javascript:"]')).toHaveCount(0);
});
