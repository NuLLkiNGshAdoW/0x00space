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
- Filesystem бесплатного Render web service ephemeral: `BACKGROUND_UPLOAD_DIR=uploads/backgrounds` подходит для local/demo, но загрузки переживут не каждый redeploy/restart.
- Render Persistent Disk сохраняет файлы между deploy/restart, но это платная опция, привязанная к одному сервису/инстансу; она не заменяет backup, object storage или multi-instance replication. Для неё задайте путь вроде `BACKGROUND_UPLOAD_DIR=/var/data/backgrounds` и подключите disk в Render.
- S3-compatible storage (AWS S3, Cloudflare R2, Backblaze и аналоги) обычно лучше для production media: нужны bucket policy, private credentials/server-side adapter, public CDN URL и отдельный backup/lifecycle plan. В репозитории такой adapter намеренно не включён, credentials не обязательны.
- Cloudinary упрощает image/video delivery и transformations, но требует account credentials, upload API integration, quota/billing и отдельной политики удаления. `BACKGROUND_PUBLIC_BASE_URL` только меняет URL в metadata, сам по себе не загружает файл в S3/Cloudinary.
- Не указывайте secrets в `BACKGROUND_PUBLIC_BASE_URL`, `VITE_*` или Git; используйте HTTPS и ограниченный public read policy.
- Не добавляйте секреты в GitHub и frontend-переменные `VITE_*`.

## Админ-сессия

Браузер получает короткоживущую HttpOnly cookie через `/api/auth/login`; пароль в `localStorage` больше не используется. Задайте `ADMIN_SESSION_SECRET` и включите `COOKIE_SECURE=true` на HTTPS. Старый `ADMIN_PASSWORD`/`ADMIN_TOKEN` и заголовок `X-Admin-Token` оставлены для совместимости скриптов. Неудачные логины ограничиваются в памяти процесса, поэтому для нескольких реплик нужен общий rate-limit на reverse proxy.

## Бэкапы Render и базы

- Для production включите managed PostgreSQL и проверьте в Render раздел **Backups**: расписание, retention и восстановление в отдельную базу.
- Перед миграциями создавайте ручную точку восстановления или экспортируйте SQL через `pg_dump`; храните архив вне репозитория и ограничьте доступ.
- После восстановления проверьте `/api/health`, чтение материалов и вход администратора до переключения трафика.
- SQLite-файл из локальной разработки (`server/local.db`) не является production-бэкапом. Render filesystem и uploads на web service не считаются постоянным хранилищем.

## Background storage configuration

`BACKGROUND_UPLOAD_DIR` defaults to `uploads/backgrounds` and preserves the local URL `/media/backgrounds/<file>`. Set an absolute path for a mounted disk. Optionally set `BACKGROUND_PUBLIC_BASE_URL` to the public directory URL of an already configured CDN/storage; the value must be HTTPS in production and must not include credentials. The API validates file paths and removes an upload if metadata persistence fails.
