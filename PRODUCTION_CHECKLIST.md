# Production checklist

## Before release

- [ ] `DATABASE_URL` указывает на managed PostgreSQL, а `CORS_ORIGINS` содержит только production frontend.
- [ ] `ADMIN_SESSION_SECRET`, `ADMIN_TOKEN` и внешние API secrets заданы в secret manager, не в Git и не в `VITE_*`.
- [ ] `COOKIE_SECURE=true` включён на HTTPS; проверены login, logout и отказ без сессии.
- [ ] Настроены Render healthcheck `/api/health`, Sentry и уведомления о сбоях.
- [ ] Проверены Render backups/retention и выполнено тестовое восстановление в отдельную базу.
- [ ] Для uploads выбран persistent object storage; локальная файловая система Render не используется для важных данных.

## Verification

- [ ] Выполнены `npm run lint`, `npm run build`, `npm run test:e2e` и `server/venv/Scripts/python.exe -m pytest server/tests`.
- [ ] Проверены ширины `320`, `375`, `768` и `1440` px: нет горизонтального скролла, CTA не обрезаются, карточки и формы читаемы.
- [ ] Проверена клавиатура без мыши: skip-to-content, меню, tabs, filters, details, form errors, dialogs/float actions; focus не теряется.
- [ ] Проверены `loading`, `empty`, `error`, `success` и disabled states при отключённом API и при медленной сети.
- [ ] В Chromium DevTools Lighthouse выполнен локальный Mobile audit (Performance, Accessibility, Best Practices, SEO) после production build; результаты записаны в release notes. Внешний сервис для CI не требуется.
- [ ] В DevTools Network проверены `img` thumbnails YouTube API, отсутствие повторных запросов и корректная загрузка logo assets.
- [ ] В sitemap добавлены только публичные маршруты. `lastmod` добавляется только из подтверждённой даты изменения контента, а не из даты деплоя.
- [ ] В production browser network проверено отсутствие повторных запросов видео и отсутствие секретов в клиентском bundle.
- [ ] После деплоя вручную проверены canonical/OG metadata, sitemap, SPA refresh для `/videos`, `/materials` и публичных content routes.
