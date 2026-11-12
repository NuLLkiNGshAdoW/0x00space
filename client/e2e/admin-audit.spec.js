import { expect, test } from "@playwright/test";

test("admin can view privacy-conscious audit entries", async ({ page }) => {
  await page.route("**/api/auth/check", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/backgrounds", (route) =>
    route.fulfill({ json: { items: [], active: null, settings: {} } }),
  );
  await page.route(/\/api\/admin\/(resources|seeds|events)(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: { items: [], page: 1, limit: 8, total: 0, has_next: false },
    }),
  );
  await page.route(/\/api\/applications\/admin(?:\/[^?]+)?(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: { items: [], page: 1, limit: 10, total: 0, has_next: false },
    }),
  );
  await page.route("**/api/admin/audit**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "audit-1",
            actor: "admin",
            action: "status_changed",
            entity_type: "application",
            entity_id: "application-1",
            details: { from: "new", to: "approved" },
            created_at: "2026-11-12T10:00:00",
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        has_next: false,
      },
    }),
  );

  await page.goto("/admin");
  await page.getByRole("button", { name: "Показать журнал" }).click();

  await expect(page.getByText("Заявка · Изменён статус")).toBeVisible();
  await expect(page.getByText("Статус: новая → одобрена")).toBeVisible();
  await expect(page.getByText("ID: application-1 · Администратор")).toBeVisible();
});
