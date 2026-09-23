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

5. Скопируйте URL backend, например `https://0x00space-api.onrender.com`.

## 2. Frontend на Vercel

Для текущего backend используйте API URL:

```env
VITE_API_BASE_URL=https://0x00space-api.onrender.com/api
```

1. В Vercel выберите **Import Project**.
2. Root Directory: `client`.
3. Framework: Vite.
4. Добавьте переменную:

```env
VITE_API_BASE_URL=https://0x00space-api.onrender.com/api
VITE_SITE_URL=https://ваш-проект.vercel.app
# optional, leave empty for a no-op integration
VITE_SENTRY_DSN=
```

5. Нажмите **Deploy**.
6. Вернитесь в Render и замените `CORS_ORIGINS` на настоящий адрес Vercel.

## Проверка перед переключением трафика

- Соберите frontend из `client` и проверьте локальный preview: `npm run build`, затем `npm run preview`.
- Прогоните `npm run lint` и `npm run test:e2e`; backend проверяйте из venv командой `server/venv/Scripts/python.exe -m pytest server/tests` на Windows или `server/venv/bin/python -m pytest server/tests` на Unix.
- В браузере проверьте viewport `320/375/768/1440`, keyboard-only navigation и states `loading/error/empty/success`.
- Запустите Lighthouse из Chrome DevTools на preview или production URL. Это локальная проверка без внешнего сервиса; не добавляйте её в обязательный CI без стабильного production-like server.
- После изменения API URL проверьте CORS, `/api/health`, thumbnails YouTube, отправку формы и SPA refresh на каждой публичной странице.

## Ограничения бесплатного варианта

- Render может усыплять backend после простоя.
- Filesystem бесплатного Render web service ephemeral: `BACKGROUND_UPLOAD_DIR=uploads/backgrounds` подходит для local/demo, но загрузки не гарантированно переживут redeploy/restart. После потери файла API исключает его из public catalog, а активный фон заменяется fallback-фоном; приложение не падает.
- Render Persistent Disk сохраняет файлы между deploy/restart, но это платная опция, привязанная к одному сервису/инстансу; она не заменяет backup, object storage или multi-instance replication. Для неё задайте путь вроде `BACKGROUND_UPLOAD_DIR=/var/data/backgrounds` и подключите disk в Render.
- S3-compatible storage (AWS S3, Cloudflare R2, Backblaze и аналоги) обычно лучше для production media: нужны bucket policy, private credentials/server-side adapter, public CDN URL и отдельный backup/lifecycle plan. В репозитории такой adapter намеренно не включён, credentials не обязательны.
- Cloudinary упрощает image/video delivery и transformations, но требует account credentials, upload API integration, quota/billing и отдельной политики удаления. `BACKGROUND_PUBLIC_BASE_URL` только меняет URL в metadata, сам по себе не загружает файл в S3/Cloudinary.
- Не указывайте secrets в `BACKGROUND_PUBLIC_BASE_URL`, `VITE_*` или Git; используйте HTTPS и ограниченный public read policy.
- Не добавляйте секреты в GitHub и frontend-переменные `VITE_*`.

## Админ-сессия

Браузер получает короткоживущую HttpOnly cookie через `/api/auth/login`; пароль в `localStorage` больше не используется. `ADMIN_SESSION_SECRET` должен быть отдельным случайным secret и задаётся в Render Environment отдельно от `ADMIN_PASSWORD` и `ADMIN_TOKEN`. На HTTPS включайте `COOKIE_SECURE=true`. Старый `ADMIN_TOKEN` и заголовок `X-Admin-Token` остаются только для backward compatibility скриптов и считаются deprecated; frontend их не использует. В production отсутствие `ADMIN_SESSION_SECRET` блокирует admin authentication. Неудачные логины ограничиваются в памяти процесса, поэтому для нескольких реплик нужен общий rate-limit на reverse proxy.

## Бэкапы Render и базы

- Для production включите managed PostgreSQL и проверьте в Render раздел **Backups**: расписание, retention и восстановление в отдельную базу.
- Перед миграциями создавайте ручную точку восстановления или экспортируйте SQL через `pg_dump`; храните архив вне репозитория и ограничьте доступ.
- После восстановления проверьте `/api/health`, чтение материалов и вход администратора до переключения трафика.
- SQLite-файл из локальной разработки (`server/local.db`) не является production-бэкапом. Render filesystem и uploads на web service не считаются постоянным хранилищем.

## Background storage configuration

`BACKGROUND_UPLOAD_DIR` defaults to `uploads/backgrounds` and preserves the local URL `/media/backgrounds/<file>`. Set an absolute path for a mounted disk. `BACKGROUND_PUBLIC_BASE_URL` only changes the URL written to metadata; it does **not** upload files to S3, Cloudinary or another object store. Do not treat it as persistent storage.

If a local file disappears after a Render restart, `GET /api/backgrounds` omits the unavailable item and returns `active: null` when the active file is gone. Activating an unavailable local item returns `409`; deleting its metadata remains possible and is safe to repeat. The frontend then uses its built-in fallback background. Uploads remain streamed in approximately 1 MiB chunks and are limited to 100 MiB.

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
