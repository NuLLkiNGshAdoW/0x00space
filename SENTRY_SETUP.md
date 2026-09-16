# Мониторинг ошибок

В проекте оставлен простой путь для подключения Sentry без обязательной
зависимости и без отправки данных по умолчанию.

## Frontend

При необходимости подключите `@sentry/react` или другой SDK в оболочке хостинга,
экспортируйте его как `window.Sentry` и добавьте в `client/.env`:

```env
VITE_SENTRY_DSN=https://...@sentry.io/...
```

Приложение вызывает только `window.Sentry.captureException`, если SDK присутствует;
без SDK и DSN работает no-op режим. Ошибки API и React render errors уже проходят
через безопасный bridge без отправки формы, cookies или query-параметров.

## Production

- настройте уведомления о падении healthcheck `/api/health`;
- учитывайте `status=degraded` и `storage.readable/writable=false` как production alert, даже если endpoint отвечает HTTP 200 для Render healthcheck;
- создайте отдельные frontend/backend проекты или окружения и проверяйте source maps только в закрытом проекте;
- задайте release/environment при подключении SDK, чтобы отделять preview от production;
- проверьте тестовым исключением, что событие приходит, а персональные поля заявки не попадают в payload;
- храните DSN и секреты только в переменных окружения;
- не отправляйте в Sentry поля заявок (ник, возраст, контакты и текст идеи).
- для backend оставьте `SENTRY_DSN` пустым локально; встроенный logging hook не требует внешнего сервиса.
- свяжите Sentry alert с on-call каналом, задайте rate limit и retention, а перед релизом проверьте recovery/runbook для недоступного storage.

Сейчас репозиторий намеренно не содержит SDK и не проверяет DSN: подключение и правила хранения данных должны быть утверждены владельцем production-проекта.
