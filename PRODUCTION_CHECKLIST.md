# Production checklist

## Before release

- [ ] `DATABASE_URL` указывает на managed PostgreSQL, а `CORS_ORIGINS` содержит только production frontend.
- [ ] `ADMIN_SESSION_SECRET` — отдельный случайный secret — задан в secret manager; `ADMIN_TOKEN` deprecated и не используется как замена session secret. Secrets не находятся в Git и `VITE_*`.
- [ ] `COOKIE_SECURE=true` включён на HTTPS; проверены login, logout и отказ без сессии.
- [ ] Настроены Render healthcheck `/api/health`, Sentry и уведомления о сбоях.
- [ ] Проверены Render backups/retention и выполнено тестовое восстановление в отдельную базу.
- [ ] Для uploads выбран persistent storage: `BACKGROUND_UPLOAD_DIR` указывает на Persistent Disk или настроен внешний storage adapter; важные файлы не остаются на ephemeral filesystem.
- [ ] Если задан `BACKGROUND_PUBLIC_BASE_URL`, он не содержит credentials и действительно раздаёт загруженные файлы по HTTPS.

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

## Backup and recovery

- [ ] PostgreSQL backup schedule, retention, restore permissions and alerting проверены в Render.
- [ ] Перед миграцией сделан `pg_dump` или restore point; архив зашифрован, хранится вне Git и доступ ограничен.
- [ ] Metadata фоновых файлов включена в backup plan; сами media-файлы бэкапятся отдельно в object storage с lifecycle/retention.
- [ ] Выполнено восстановление в отдельную базу и отдельное storage namespace; проверены `/api/health`, чтение материалов, login и активный background.
- [ ] Есть rollback plan для приложения, database migration и media metadata; потеря ephemeral Render filesystem считается ожидаемым сценарием.

## Monitoring and CI

- [ ] Render monitor проверяет `/api/health` и уведомляет о недоступности/degraded storage; health response не содержит secrets.
- [ ] Sentry frontend/backend разделены по environment, release/source maps закрыты, PII заявок исключены, alert routing проверен тестовым событием.
- [ ] CI запускает `npm run lint`, `npm run build`, Playwright Chromium и backend `pytest`; тесты не требуют production credentials.
- [ ] Lighthouse запускается вручную на production-like preview после build, результаты сохраняются в release notes; внешний Lighthouse CI не является обязательным.
