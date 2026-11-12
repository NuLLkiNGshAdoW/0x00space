# Деплой: Vercel + Render

## 1. Backend на Render

1. Загрузите проект в GitHub.
2. В Render выберите **New → Blueprint** и укажите репозиторий.
3. Render найдёт `render.yaml` и создаст API.
4. В настройках API задайте:

```env
DATABASE_URL=<Internal Database URL из Render>
CORS_ORIGINS=["https://ваш-проект.vercel.app"]
YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=...
```

5. Скопируйте URL backend, например `https://zerox00space-api.onrender.com`.

## 2. Frontend на Vercel

Для текущего backend используйте API URL:

```env
VITE_API_BASE_URL=https://zerox00space-api.onrender.com/api
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
```

1. В Vercel выберите **Import Project**.
2. Root Directory: `client`.
3. Framework: Vite.
4. Добавьте переменную:

```env
VITE_API_BASE_URL=https://zerox00space-api.onrender.com/api
VITE_SITE_URL=https://ваш-проект.vercel.app
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
# optional release override; Vercel uses its commit SHA by default
VITE_SENTRY_RELEASE=
```

5. Нажмите **Deploy**.
6. Вернитесь в Render и замените `CORS_ORIGINS` на настоящий адрес Vercel.

### Мониторинг ошибок Sentry

Создайте отдельные проекты Sentry для React frontend и FastAPI backend. В Vercel задайте
`VITE_SENTRY_DSN` (публичный ingest DSN frontend-проекта) и
`VITE_SENTRY_ENVIRONMENT=production`. В Render задайте `SENTRY_DSN` backend-проекта и
`SENTRY_ENVIRONMENT=production`; blueprint уже объявляет эти переменные. На frontend
release берётся из `VERCEL_GIT_COMMIT_SHA`, на Render — из `RENDER_GIT_COMMIT`;
для локальной сборки или другого хостинга можно задать `VITE_SENTRY_RELEASE` и
`SENTRY_RELEASE`.

SDK отключён, пока DSN не задан. По умолчанию отправляются ошибки React render, network,
некорректных ответов и HTTP 5xx; ожидаемые 4xx не отправляются. Перед отправкой удаляются
тексты исключений, адреса и query-параметры запросов, заголовки, cookies, тела запросов,
breadcrumbs и user-данные. Performance tracing выключен. Для frontend DSN является
публичным идентификатором ingest, а не секретом; не добавляйте в frontend auth token Sentry.
В Sentry включите уведомления о новых issues и всплеске событий (например, 5 ошибок за 5 минут).
Ожидаемые 4xx-ответы и сетевые таймауты SDK не отправляет.

## Проверка перед переключением трафика

- Соберите frontend из `client` и проверьте локальный preview: `npm run build`, затем `npm run preview`.
- Прогоните `npm run lint` и `npm run test:e2e`; backend проверяйте из venv командой `server/venv/Scripts/python.exe -m pytest server/tests` на Windows или `server/venv/bin/python -m pytest server/tests` на Unix.
- В браузере проверьте viewport `320/375/768/1440`, keyboard-only navigation и states `loading/error/empty/success`.
- CI запускает Lighthouse на production preview после `npm run build` и проверяет минимальные оценки и бюджет передачи. После deploy дополнительно проверьте production URL с реальным API: данные, CORS и метрики могут отличаться от локального preview.
- После изменения API URL проверьте CORS, `/api/health` (`status: ok`, `database.schema_ready: true`), чтение `/api/resources`, `/api/seeds` и `/api/events`, thumbnails YouTube, отправку формы и SPA refresh на каждой публичной странице.
- GitHub Actions запускает `API uptime and resource links` каждые 6 часов и по кнопке **Run workflow**. Он проверяет `/api/health` и ссылки скачивания всех материалов; результат с ошибками завершает workflow как failed. При необходимости задайте GitHub Actions variable `API_BASE_URL` (URL API вместе с `/api`); по умолчанию используется production API из `render.yaml`.
- Чтобы получать уведомления о failed workflow, включите уведомления GitHub Actions в настройках GitHub: **Settings → Notifications → Actions**. При HTTP 5xx или `status: degraded` проверка завершится до проверки ссылок каталога.

## Ограничения бесплатного варианта

- Render может усыплять backend после простоя.
- Filesystem бесплатного Render web service ephemeral: `BACKGROUND_UPLOAD_DIR=uploads/backgrounds` подходит для local/demo, но загрузки не гарантированно переживут redeploy/restart. После потери файла API исключает его из public catalog, а активный фон заменяется fallback-фоном; приложение не падает.
- Render Persistent Disk сохраняет файлы между deploy/restart, но это платная опция, привязанная к одному сервису/инстансу; она не заменяет backup, object storage или multi-instance replication. Для неё задайте путь вроде `BACKGROUND_UPLOAD_DIR=/var/data/backgrounds` и подключите disk в Render.
- S3-compatible storage (AWS S3, Cloudflare R2, Backblaze и аналоги) обычно лучше для production media: нужны bucket policy, private credentials/server-side adapter, public CDN URL и отдельный backup/lifecycle plan. В репозитории такой adapter намеренно не включён, credentials не обязательны.
- Cloudinary упрощает image/video delivery и transformations, но требует account credentials, upload API integration, quota/billing и отдельной политики удаления. `BACKGROUND_PUBLIC_BASE_URL` только меняет URL в metadata, сам по себе не загружает файл в S3/Cloudinary.
- Не указывайте secrets в `BACKGROUND_PUBLIC_BASE_URL`, `VITE_*` или Git; используйте HTTPS и ограниченный public read policy.
- Не добавляйте секреты в GitHub и frontend-переменные `VITE_*`.

## Админ-сессия

Администраторы входят по персональному логину и паролю; пароль хранится как PBKDF2-HMAC-SHA256 hash с индивидуальной солью. Браузер получает короткоживущую HttpOnly cookie, привязанную к ID аккаунта и его версии сессии. `ADMIN_SESSION_SECRET` — отдельный случайный secret, используемый только для подписи cookies. На HTTPS включайте `COOKIE_SECURE=true`. Общий `ADMIN_PASSWORD`, `ADMIN_TOKEN` и заголовок `X-Admin-Token` больше не поддерживаются.

Для локальной разработки из каталога `server` создайте аккаунт командой `python -m scripts.manage_admin create <username>`. Другие команды: `list`, `set-password <username>`, `disable <username>`, `enable <username>` и `revoke-sessions <username>`. Пароль вводится через скрытый prompt, а смена пароля, блокировка, включение и явный отзыв сессий инвалидируют ранее выданные cookies. Не передавайте пароль аргументом командной строки.

Перед выпуском новой версии на существующую production-базу примените `alembic upgrade head`, затем создайте первый аккаунт через CLI в окружении с production `DATABASE_URL`, `ADMIN_SESSION_SECRET` и `RATE_LIMIT_REDIS_URL`; только после этого переключайте трафик на новую версию. Новые административные маршруты требуют таблицу `admin_users`. В production отсутствие session secret или Redis URL блокирует запуск приложения. На Render за Cloudflare задайте `TRUSTED_CLIENT_IP_HEADER=cf-connecting-ip`, иначе rate limiter увидит адрес прокси вместо IP посетителей.

Все `/api/*` маршруты, кроме `/api/health` и CORS preflight, ограничены общим per-IP sliding-window лимитом. В production счётчики API, неудачных входов, заявок и результатов игры хранятся в Redis; `RATE_LIMIT_REDIS_URL` обязателен для production PostgreSQL. Тот же Redis используется для кеша ответов YouTube с TTL из `YOUTUBE_CACHE_TTL_SECONDS`, поэтому реплики делят кеш и не дублируют запросы к YouTube API. Используйте приватный URL управляемого Redis. В Redis сохраняются только хеши IP-адресов, ключи rate limit автоматически истекают после окна ограничения. По умолчанию разрешено 120 запросов за 60 секунд; значения настраиваются через `API_RATE_LIMIT_REQUESTS` и `API_RATE_LIMIT_WINDOW_SECONDS`. Более строгие лимиты заявок и результатов игры также общие для реплик. Ответ при превышении — HTTP 429 с `Retry-After`. При недоступности Redis API закрывается с HTTP 503, а healthcheck сообщает `degraded`; автоматического возврата к локальному счётчику или кешу нет. В локальной разработке, если `RATE_LIMIT_REDIS_URL` не задан, используется ограничитель и кеш в памяти процесса. `TRUSTED_CLIENT_IP_HEADER` включайте только если backend нельзя обойти напрямую.

## Бэкапы Render и базы

- Для production включите managed PostgreSQL и проверьте в Render раздел **Backups**: расписание, retention и восстановление в отдельную базу.
- GitHub Actions workflow `Encrypted PostgreSQL backup and restore test` ежедневно создаёт `pg_dump`, шифрует его AES-256, проверяет расшифровку и восстанавливает копию во временный PostgreSQL. Зашифрованный архив хранится как приватный GitHub Actions artifact 30 дней.
- Для запуска workflow добавьте в **GitHub → Settings → Secrets and variables → Actions** секреты `DATABASE_URL` (внешний PostgreSQL URL из Render) и `BACKUP_ENCRYPTION_PASSPHRASE` (длинная случайная парольная фраза). Сохраните парольную фразу также в password manager вне GitHub: без неё архивы не восстановить. Настройте доступ Render PostgreSQL с GitHub-hosted runners; секреты не печатаются workflow.
- GitHub artifact — дополнительная зашифрованная копия с 30-дневным retention, а не замена Render backups. Для восстановления скачайте `production.dump.enc` из успешного workflow и выполните на доверенной машине:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in production.dump.enc -out production.dump \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE
pg_restore --list production.dump
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="$RESTORE_DATABASE_URL" production.dump
```

- Перед миграциями создавайте ручную точку восстановления или экспортируйте SQL через `pg_dump`; храните архив вне репозитория и ограничьте доступ.
- После восстановления проверьте `/api/health`, чтение материалов и вход администратора до переключения трафика.
- SQLite-файл из локальной разработки (`server/local.db`) не является production-бэкапом. Render filesystem и uploads на web service не считаются постоянным хранилищем.

## Background storage configuration

`BACKGROUND_UPLOAD_DIR` defaults to `uploads/backgrounds` and preserves the local URL `/media/backgrounds/<file>`. Set an absolute path for a mounted disk. `BACKGROUND_PUBLIC_BASE_URL` only changes the URL written to metadata; it does **not** upload files to S3, Cloudinary or another object store. Do not treat it as persistent storage.

If a local file disappears after a Render restart, `GET /api/backgrounds` omits the unavailable item and returns `active: null` when the active file is gone. Activating an unavailable local item returns `409`; deleting its metadata remains possible and is safe to repeat. The frontend then uses its built-in fallback background. Uploads remain streamed in approximately 1 MiB chunks and are limited to 100 MiB.

### Cloudflare R2 (optional)

The backend supports an S3-compatible bucket for both media files and the background
catalog. Cloudflare R2 currently includes monthly Standard-tier allowances of
10 GB-month storage, 1 million Class A requests and 10 million Class B requests;
internet egress is free. Usage above free allowances is billed, so this is not a
hard spending cap. Check [current R2 pricing](https://developers.cloudflare.com/r2/pricing/)
before enabling it and set usage alerts in Cloudflare.

1. Create a Standard R2 bucket and an API token limited to that bucket.
2. Enable public reads for the media bucket using a custom domain or R2 public URL.
   Set `BACKGROUND_PUBLIC_BASE_URL` to that HTTPS URL without a trailing slash.
3. Configure `BACKGROUND_STORAGE_BACKEND=s3`, `BACKGROUND_S3_ENDPOINT_URL`
   (`https://<account-id>.r2.cloudflarestorage.com`), `BACKGROUND_S3_BUCKET`,
   `BACKGROUND_S3_ACCESS_KEY_ID`, `BACKGROUND_S3_SECRET_ACCESS_KEY`, and
   `BACKGROUND_S3_REGION=auto` in the backend's secret environment. Never put
   access keys in frontend `VITE_*` variables or Git.
4. The `.background-catalog.json` object stores the same public catalog/settings
   exposed by `/api/backgrounds`; it contains no credentials. Keep the bucket
   writable by the backend and public-readable through the configured media URL.
5. Uploads up to 100 MiB are streamed to a temporary file before being sent to R2.
   Health checks verify bucket access and a temporary write/delete operation.

With `BACKGROUND_STORAGE_BACKEND=local` (the default), local development and
existing behavior are unchanged. To migrate existing backgrounds, configure the
R2 variables in the environment used for the migration and set
`BACKGROUND_UPLOAD_DIR` to the directory containing the current local files and
`metadata.json`. Pause background changes in the admin panel, then run from
`server`:

```bash
python scripts/migrate_backgrounds_to_s3.py
python scripts/migrate_backgrounds_to_s3.py --apply
```

The first command only validates and reports the plan. `--apply` uploads files,
checks object sizes and SHA-256 checksums, and writes the catalog last. The script
is safe to rerun when files and catalog already match; it refuses to replace a
different destination catalog. Keep the existing local files until the new API
configuration is deployed and `/api/backgrounds` returns the expected catalog.
No R2 account or keys are required for local development.

## Database migrations

Схема базы данных изменяется через Alembic. Production startup больше не
вызывает `Base.metadata.create_all()` для PostgreSQL. Локальный SQLite может
создаваться автоматически только при `DEBUG=true`; production-изменения всегда
выполняются отдельной одноразовой командой.

`render.yaml` намеренно не запускает Alembic в `startCommand`: запуск миграции
из каждого web instance создаёт race при deploy/scale и не является безопасным
lock-механизмом. Для Render используйте одноразовый Shell/Job или защищённую
машину с тем же `DATABASE_URL`, завершите миграцию и только затем переключайте
трафик. Не запускайте миграцию одновременно из нескольких процессов.

Команды запускаются из каталога `server` и используют `DATABASE_URL` из текущей
конфигурации приложения. Не печатайте URL с credentials в CI-логи:

```bash
# Проверить установленную ревизию и доступную head
alembic current
alembic heads

# Создать новую forward-only migration после изменения моделей
alembic revision --autogenerate -m "describe schema change"

# Просмотреть SQL без выполнения
alembic upgrade head --sql

# Применить миграции на новой базе или после baseline
alembic upgrade head

# Проверить состояние после применения
alembic current
psql "$DATABASE_URL" -c 'SELECT version_num FROM alembic_version;'
```

Глобальный рейтинг мини-игры добавляет ревизия `20261111_0002` и таблица
`game_leaderboard`. На существующей базе, уже отмеченной как baseline
`20260922_0001`, перед публикацией новой версии API выполните одноразово
`alembic upgrade head` по процедуре выше.

Архивирование материалов, сидов и событий добавляет ревизия `20261112_0003` с
nullable `archived_at` колонками. Перед deploy новой версии API примените
`alembic upgrade head`; healthcheck покажет `schema_ready: false` и недостающие
колонки, пока миграция не завершится.

Журнал действий администратора добавляет ревизия `20261112_0006` и таблица
`admin_audit_logs`; ревизия `20261112_0007` добавляет аккаунты `admin_users` и
привязку журнала к `actor_id`. Перед deploy примените `alembic upgrade head`. Журнал
сохраняет тип действия, тип и ID сущности, список изменённых полей и только
переход статуса заявки; содержимое и контакты заявок не сохраняются. Так как
админка использует общий пароль, записи не различают конкретных людей.
Healthcheck считает схему неготовой, пока таблица журнала не создана.

### A. Уже существующая production PostgreSQL

Первая ревизия (`20260922_0001`) описывает модели `applications`, `resources`,
`seeds`, `events` и предназначена для новой базы. Нельзя выполнять
`alembic upgrade head` на существующей базе, если baseline ещё не отмечен:
Alembic попытается создать уже существующие таблицы.

1. Остановите deploy, который может менять схему, и создайте backup:

```bash
pg_dump --format=custom --file=0x00-space-pre-baseline.dump "$DATABASE_URL"
pg_restore --list 0x00-space-pre-baseline.dump > 0x00-space-pre-baseline.list
```

Проверьте, что backup читается и хранится вне репозитория. Для managed Render
также проверьте штатный backup/restore point.

2. Проверьте фактическую схему и данные:

```bash
alembic current
alembic heads
psql "$DATABASE_URL" -c '\dt'
psql "$DATABASE_URL" -c "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;"
psql "$DATABASE_URL" -c 'SELECT count(*) FROM applications; SELECT count(*) FROM resources; SELECT count(*) FROM seeds; SELECT count(*) FROM events;'
```

Сравните таблицы, колонки, nullability, enum-типы и индексы с `models.py` и
`migrations/versions/20260922_0001_baseline.py`. Если есть расхождение,
сначала создайте отдельную reviewed migration; `stamp` не должен маскировать
расхождение.

3. Если схема совпадает с baseline и revision ещё не установлена, выполните
только metadata stamp без DDL:

```bash
alembic stamp 20260922_0001
alembic current
psql "$DATABASE_URL" -c 'SELECT version_num FROM alembic_version;'
```

`stamp` только создаёт/обновляет `alembic_version`; он не пересоздаёт таблицы и
не изменяет пользовательские данные.

4. Повторно проверьте counts и запустите smoke test `/api/health`, public reads
и admin reads. После baseline новые migration применяются через
`alembic upgrade head`.

### B. Новая/пустая production PostgreSQL

Для новой базы stamp не нужен:

```bash
alembic current
alembic upgrade head
alembic current
psql "$DATABASE_URL" -c '\dt'
```

Ожидаемая revision — `20260922_0001`; ожидаемые application tables —
`applications`, `resources`, `seeds`, `events` плюс `alembic_version`.

После baseline новые изменения выполняются только так:

```bash
alembic revision --autogenerate -m "add ..."
# внимательно проверить generated diff и SQL
alembic upgrade head
```

`downgrade` разрешён только для обратимых development-миграций на отдельной
тестовой базе. Baseline намеренно необратим: его downgrade выбрасывает ошибку,
чтобы случайно не удалить production-таблицы.

### Rollback / аварийный сценарий

Не выполняйте `drop_all`, ручное удаление таблиц или необратимый downgrade на
production. Если migration или deploy нужно отменить:

1. Остановите повторный deploy и сохраните логи/текущий `alembic current`.
2. Не пытайтесь откатывать baseline через Alembic.
3. Восстановите backup в отдельную PostgreSQL database, проверьте counts,
   schema и `/api/health` на временном backend.
4. Переключите `DATABASE_URL` на проверенную восстановленную базу только после
   smoke test login, public reads и admin reads.
5. Если проблема относится к новой forward migration, исправьте её новой
   forward migration после проверки SQL на staging/копии backup.
