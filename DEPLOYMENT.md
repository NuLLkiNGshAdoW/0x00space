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
VITE_API_BASE_URL=https://zerox00space-api.onrender.com/api
```

1. В Vercel выберите **Import Project**.
2. Root Directory: `client`.
3. Framework: Vite.
4. Добавьте переменную:

```env
VITE_API_BASE_URL=https://0x00space-api.onrender.com/api
```

5. Нажмите **Deploy**.
6. Вернитесь в Render и замените `CORS_ORIGINS` на настоящий адрес Vercel.

## Ограничения бесплатного варианта

- Render может усыплять backend после простоя.
- Локальные загрузки фонов на Render не являются постоянным хранилищем.
- Для фоновых видео подключите Supabase Storage или Cloudinary.
- Не добавляйте секреты в GitHub и frontend-переменные `VITE_*`.
