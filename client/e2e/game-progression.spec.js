import { expect, test } from "@playwright/test";

test("global leaderboard loads public pilot scores", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("space-runner-player-id", "c353ad5f-09a1-4f5e-a4ed-273a1c234567"));
  await page.route("**/game/leaderboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          player_id: "c353ad5f-09a1-4f5e-a4ed-273a1c234567",
          nickname: "Star Pilot",
          score: 1840,
          difficulty: "adaptive",
          ship: "interceptor",
          updated_at: "2026-11-11T12:00:00",
        },
      ]),
    });
  });
  await page.goto("/game");

  await expect(page.locator(".game-leaderboard-list li")).toHaveCount(1);
  await expect(page.locator(".game-leaderboard-list li")).toContainText("Star Pilot");
  await expect(page.locator(".game-leaderboard-list li")).toContainText("1 840");
  await expect(page.locator(".game-leaderboard-list li")).toContainText("ТЫ");
});

test("adaptive difficulty starts gently and displays the current pressure", async ({ page }) => {
  await page.goto("/game");
  const adaptive = page.getByRole("button", { name: /Адаптивный/ });
  await adaptive.click();
  await expect(adaptive).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("space-runner-difficulty")))
    .toBe("adaptive");

  await page.getByRole("button", { name: "Начать полёт" }).click();
  await expect(page.locator(".game-adaptive-status")).toHaveText("ТЕМП 86%");
  await expect(page.locator(".game-shell")).toHaveClass(/is-adaptive/);
});

test("audio settings toggle and persist music and sound effects separately", async ({ page }) => {
  await page.goto("/game");
  await page.locator(".game-audio-settings summary").click();

  const effects = page.getByRole("checkbox", { name: "Звуковые эффекты" });
  const music = page.getByRole("checkbox", { name: "Фоновая музыка" });
  await expect(effects).toBeChecked();
  await expect(music).toBeChecked();
  await effects.uncheck();
  await music.uncheck();
  await expect
    .poll(() => page.evaluate(() => [localStorage.getItem("space-runner-sound"), localStorage.getItem("space-runner-music")]))
    .toEqual(["off", "off"]);

  await page.reload();
  await page.locator(".game-audio-settings summary").click();
  await expect(page.getByRole("checkbox", { name: "Звуковые эффекты" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Фоновая музыка" })).not.toBeChecked();
});

test("first-flight tutorial can be completed and is remembered", async ({ page }) => {
  await page.goto("/game");
  await expect(page.locator(".game-overlay-kicker")).toContainText("ИНСТРУКТАЖ · 01/04");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.locator(".game-overlay-kicker")).toContainText("ИНСТРУКТАЖ · 02/04");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.locator(".game-tutorial-ship-ability")).toContainText("ЩИТ");
  await page.getByRole("button", { name: "Начать полёт" }).click();

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("space-runner-tutorial-complete")))
    .toBe("done");
  await expect(page.locator(".game-overlay")).toBeHidden();

  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => localStorage.removeItem("space-runner-tutorial-complete"));
  await page.reload();
  const skip = page.getByRole("button", { name: "Начать полёт" });
  const skipBox = await skip.boundingBox();
  const stageBox = await page.locator(".game-stage").boundingBox();
  expect(skipBox.y + skipBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height);
});

test("boss victories unlock ships with distinct abilities", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "space-runner-pilot-profile",
      JSON.stringify({ stars: 0, bosses: 1, sectors: 0, unlocked: [] }),
    );
  });
  await page.goto("/game");

  const interceptor = page.getByRole("button", { name: /Перехватчик/ });
  await expect(interceptor).toBeEnabled();
  await expect(page.locator(".game-ship-card").filter({ hasText: "Страж" })).toBeDisabled();
  await interceptor.click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("space-runner-selected-ship")))
    .toBe("interceptor");

  await page.getByRole("button", { name: "Начать полёт" }).click();
  const dash = page.getByRole("button", { name: "Активировать способность: РЫВОК" });
  await dash.click();
  await expect(dash).toBeDisabled();
  await expect(dash).toHaveClass(/is-cooling/);
});

test("guardian ship adds a starting life", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "space-runner-pilot-profile",
      JSON.stringify({ stars: 0, bosses: 3, sectors: 0, unlocked: [] }),
    );
  });
  await page.goto("/game");
  await page.getByRole("button", { name: /Страж/ }).click();
  await page.getByRole("button", { name: "Начать полёт" }).click();

  await expect(page.locator(".game-lives")).toHaveAttribute("aria-label", "Осталось жизней: 4");
  await expect(page.locator(".game-lives span")).toHaveCount(4);
});
