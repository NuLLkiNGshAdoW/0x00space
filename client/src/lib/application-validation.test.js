import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OTHER_GAME, validateApplicationForm } from "./application-validation.js";

const validForm = {
  nickname: "Steve",
  contact: "@steve",
  game: "Minecraft",
  customGame: "",
  age: "18",
  micOrExperience: "",
  videoIdea: "Build a base together",
  consent: true,
};

describe("validateApplicationForm", () => {
  it("accepts otherwise valid fields with surrounding whitespace", () => {
    const errors = validateApplicationForm({
      ...validForm,
      nickname: "  Steve  ",
      contact: "  @steve ",
      videoIdea: "  Build a base together  ",
    });

    assert.deepEqual(errors, {});
  });

  for (const age of ["5", "101", "18.5", "not-a-number", ""]) {
    it(`rejects invalid age ${JSON.stringify(age)}`, () => {
      assert.equal(validateApplicationForm({ ...validForm, age }).age, "Возраст от 6 до 100 лет");
    });
  }

  for (const age of ["6", "100"]) {
    it(`accepts age boundary ${age}`, () => {
      assert.equal(validateApplicationForm({ ...validForm, age }).age, undefined);
    });
  }

  for (const value of ["", "a"]) {
    it(`rejects a nickname or contact shorter than two characters: ${JSON.stringify(value)}`, () => {
      const errors = validateApplicationForm({
        ...validForm,
        nickname: value,
        contact: value,
      });

      assert.equal(errors.nickname, "Укажите ник или имя — минимум 2 символа");
      assert.equal(errors.contact, "Укажите Discord или Telegram для связи");
    });
  }

  it("requires a valid custom game, idea, and consent", () => {
    const errors = validateApplicationForm({
      ...validForm,
      game: OTHER_GAME,
      customGame: " ",
      videoIdea: "idea",
      consent: false,
    });

    assert.equal(errors.customGame, "Напишите, в какую игру хотите поиграть");
    assert.equal(errors.videoIdea, "Опишите идею подробнее — хотя бы несколько слов");
    assert.equal(errors.consent, "Подтвердите согласие на обработку данных");
  });

  it("rejects values exceeding server-side length limits", () => {
    const errors = validateApplicationForm({
      ...validForm,
      nickname: "n".repeat(65),
      contact: "c".repeat(65),
      game: OTHER_GAME,
      customGame: "g".repeat(65),
    });

    assert.equal(errors.nickname, "Ник не должен быть длиннее 64 символов");
    assert.equal(errors.contact, "Контакт не должен быть длиннее 64 символов");
    assert.equal(errors.customGame, "Название игры не должно быть длиннее 64 символов");
  });
});
