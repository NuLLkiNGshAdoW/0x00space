export const OTHER_GAME = "Другая игра";

export function validateApplicationForm(form) {
  const errors = {};

  if (form.nickname.trim().length < 2) {
    errors.nickname = "Укажите ник или имя — минимум 2 символа";
  }
  if (form.nickname.trim().length > 64) {
    errors.nickname = "Ник не должен быть длиннее 64 символов";
  }
  if (form.contact.trim().length < 2) {
    errors.contact = "Укажите Discord или Telegram для связи";
  }
  if (form.contact.trim().length > 64) {
    errors.contact = "Контакт не должен быть длиннее 64 символов";
  }
  if (form.game === OTHER_GAME && form.customGame.trim().length < 2) {
    errors.customGame = "Напишите, в какую игру хотите поиграть";
  }
  if (form.game === OTHER_GAME && form.customGame.trim().length > 64) {
    errors.customGame = "Название игры не должно быть длиннее 64 символов";
  }
  const age = Number(form.age);
  if (!form.age || Number.isNaN(age) || !Number.isInteger(age) || age < 6 || age > 100) {
    errors.age = "Возраст от 6 до 100 лет";
  }
  if (form.videoIdea.trim().length < 5) {
    errors.videoIdea = "Опишите идею подробнее — хотя бы несколько слов";
  }
  if (!form.consent) {
    errors.consent = "Подтвердите согласие на обработку данных";
  }

  return errors;
}
