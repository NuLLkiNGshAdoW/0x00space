import { expect, test } from "@playwright/test";

test("open event registration uses the configured external link", async ({ page }) => {
  await page.route("**/api/events/games", (route) => route.fulfill({ json: ["Minecraft"] }));
  await page.route(/\/api\/events(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "event-1",
            title: "Открытый сервер",
            description: "Совместное выживание в Minecraft.",
            game: "Minecraft",
            starts_at: "2030-02-03T18:30:00",
            image_url: null,
            max_participants: 20,
            status: "registration_open",
            registration_url: "https://example.test/register",
            created_at: "2026-01-01T00:00:00",
          },
        ],
        page: 1,
        limit: 8,
        has_next: false,
      },
    }),
  );

  await page.goto("/events");
  const register = page.getByRole("link", { name: "Зарегистрироваться" });
  await expect(register).toHaveAttribute("href", "https://example.test/register");
  await expect(register).toHaveAttribute("target", "_blank");
});

test("event application link preselects its event and submits the event ID", async ({ page }) => {
  const event = {
    id: "event-apply-1",
    title: "Совместное выживание",
    description: "Играем вместе на сервере.",
    game: "Minecraft",
    starts_at: "2030-02-03T18:30:00",
    image_url: null,
    max_participants: 8,
    status: "registration_open",
    registration_url: null,
    application_count: 2,
    created_at: "2026-01-01T00:00:00",
  };
  let submittedApplication;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/events/event-apply-1")) return route.fulfill({ json: event });
    if (url.pathname.endsWith("/events") && request.method() === "GET") return route.fulfill({
      json: { items: [event], page: 1, limit: 8, has_next: false },
    });
    if (request.method() === "POST" && url.pathname.endsWith("/applications")) {
      submittedApplication = request.postDataJSON();
      return route.fulfill({ status: 201, json: { id: "application-1" } });
    }
    if (url.pathname.endsWith("/youtube/latest")) return route.fulfill({ json: [] });
    if (url.pathname.endsWith("/backgrounds")) return route.fulfill({ json: { items: [], active: null, settings: {} } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/events");
  const eventCard = page.getByRole("article").filter({ hasText: event.title });
  await expect(eventCard.getByText("Заявки: 2 / 8")).toBeVisible();
  await eventCard.getByRole("link", { name: "Подать заявку" }).click();
  await expect(page).toHaveURL(/event_id=event-apply-1/);
  const form = page.locator("#application");
  await expect(form.getByText("Совместное выживание")).toBeVisible();
  await expect(form.getByLabel("Игра")).toHaveValue("Minecraft");
  await form.getByLabel("Игровой ник / имя").fill("EventPlayer");
  await form.getByLabel("Контакт (Discord или Telegram)").fill("@event-player");
  await form.getByLabel("Возраст").fill("19");
  await form.getByLabel("Идея для видео / сообщение").fill("Сыграть в событии вместе.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Отправить заявку" }).click();

  await expect(form.getByRole("status")).toContainText("Заявка отправлена");
  expect(submittedApplication.event_id).toBe(event.id);
});

test("home highlights the next event with its application count and signup action", async ({ page }) => {
  const event = {
    id: "home-event",
    title: "Космическое выживание",
    description: "Собираем команду на совместную игру.",
    game: "Minecraft",
    starts_at: "2030-02-03T18:30:00",
    image_url: null,
    max_participants: 8,
    status: "registration_open",
    registration_url: null,
    application_count: 3,
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/events")) {
      return route.fulfill({ json: url.searchParams.get("status") === "registration_open" ? { items: [event], has_next: false } : { items: [], has_next: false } });
    }
    if (url.pathname.endsWith("/youtube/latest")) return route.fulfill({ json: [] });
    if (url.pathname.endsWith("/backgrounds")) return route.fulfill({ json: { items: [], active: null, settings: {} } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/");

  const feature = page.getByRole("region", { name: event.title });
  await expect(feature.getByRole("heading", { name: event.title })).toBeVisible();
  await expect(feature.getByText("Заявки: 3 / 8")).toBeVisible();
  await expect(feature.getByRole("link", { name: "Подать заявку" })).toHaveAttribute("href", /event_id=home-event/);
});
