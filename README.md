# 0x00 SPACE — сайт для подписчиков

Сайт игрового YouTube-канала **@0x00space** (Minecraft, кооп, хорроры, инди).
Backend — FastAPI, Frontend — React (Vite) + Tailwind CSS.

## Структура проекта

```
0x00space/
├── client/                        # Frontend
│   ├── src/
│   │   ├── main.jsx / App.jsx
│   │   ├── index.css              # Tailwind + дизайн-токены
│   │   ├── services/api.js        # API-клиент (VITE_API_BASE_URL)
│   │   ├── lib/
│   │   │   ├── utils.js           # formatDuration, formatViews, cn...
│   │   │   └── socials.js         # ссылки на соцсети
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       ├── HeroSection.jsx
│   │       ├── YouTubeGallery.jsx + VideoCard / VideoCardSkeleton
│   │       ├── ResourcesAndGuides.jsx + ResourceCard / SeedCard / CopyButton
│   │       ├── ApplicationForm.jsx
│   │       ├── Footer.jsx
│   │       └── icons/LogoMark.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── Dockerfile                 # multi-stage build + nginx для статики
├── server/                        # Backend (см. app/ — модели, роутеры, сервисы)
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── seed_data.py
├── docker-compose.yml
└── README.md
```

## Реализованный функционал

### Backend

| Метод | Эндпоинт                | Описание                                                             |
|-------|--------------------------|------------------------------------------------------------------------|
| GET   | `/api/youtube/latest`    | Последние видео/Shorts (кеш 15 мин), включая `duration_seconds`, `view_count` |
| POST  | `/api/applications`      | Заявка подписчика (ник, контакт, игра, возраст, идея) + уведомление в Telegram |
| GET   | `/api/resources`         | Материалы, фильтры `resource_type` и `game_category`                  |
| GET   | `/api/seeds`             | Интересные сиды миров                                                  |
| GET   | `/api/health`            | Healthcheck                                                            |

Swagger UI: `http://localhost:8000/docs`.

### Frontend

- **Navbar** — sticky, blur при скролле, мобильное меню.
- **HeroSection** — CTA "Смотреть ролики" / "Подать заявку на ивент".
- **YouTubeGallery** — табы Все / Видео / Shorts, скелетоны загрузки, обработка ошибок API.
- `Button` и `Card` — общие UI primitives с одинаковыми hover/focus/disabled состояниями.
- **ResourcesAndGuides** — вкладки "Материалы" / "Сиды миров", фильтр по играм
  (Все / Minecraft / Кооператив / Хорроры / Другое), кнопка "Скопировать" для сидов и координат.
- **ApplicationForm** — валидация на клиенте (ник, контакт, возраст 6–100, идея), выбор игры
  (Minecraft / Phasmophobia / Lethal Company / другая — с полем ввода), состояния успеха/ошибки.
- **Footer** — копирайт и соцсети.
- Error capture работает в no-op режиме без Sentry DSN; при наличии SDK ошибки API и рендера могут быть отправлены без данных форм.

Полностью адаптивно: mobile → tablet → desktop (проверено на брейкпоинтах Tailwind `sm`/`lg`).

## Локальный запуск (без Docker)

### 1. Backend

```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# заполнить YOUTUBE_API_KEY и YOUTUBE_CHANNEL_ID; Telegram-канал указан в client/src/lib/socials.js

python seed_data.py        # опционально: тестовые материалы и сиды
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

В отдельном терминале:

```bash
cd client
npm install

cp .env.example .env
# по умолчанию VITE_API_BASE_URL=http://localhost:8000/api — подходит для локальной разработки

npm run dev
```

Сайт откроется на `http://localhost:5173`, backend — на `http://localhost:8000`.

### Управление фоном

В `server/.env` задайте секретный токен:

```env
ADMIN_TOKEN=длинная-случайная-строка
```

Перезапустите backend и откройте `http://localhost:5173/admin`. В админке можно
загрузить JPG/PNG/WebP или живое видео MP4/WebM до 100 МБ, выбрать активный фон
и удалить старые файлы. Форматы `.exe`, `.scr` и обои, требующие отдельной
программы Windows, сайт не запускает — экспортируйте их в MP4/WebM.

## Запуск через Docker Compose (backend + frontend + PostgreSQL)

```bash
cp server/.env.example server/.env   # заполнить YouTube/Telegram ключи
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Бесплатный деплой

Пошаговая схема Vercel + Render описана в [DEPLOYMENT.md](DEPLOYMENT.md).

### Переменные окружения frontend

Vercel должен использовать Root Directory `client`; `client/vercel.json` задаёт сборку Vite (`npm run build` и `dist`) и fallback всех SPA-маршрутов на `index.html`.

- `VITE_API_BASE_URL` — публичный URL backend с суффиксом `/api`.
- `VITE_SITE_URL` — канонический URL сайта для metadata (по умолчанию `https://0x00space.ru`).
- `VITE_GA_MEASUREMENT_ID` — необязательно; без него аналитика отключена.

Переменные с префиксом `VITE_` попадают в браузер. Не размещайте в них API-ключи, токены или пароли.

## Как получить ключи

**YouTube Data API v3:**
1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект → включить "YouTube Data API v3".
2. Создать API-ключ в разделе Credentials.
3. Найти `YOUTUBE_CHANNEL_ID` (не handle `@0x00space`, а `UC...`) — например, через
   [commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php).

**Telegram Bot API:**
1. [@BotFather](https://t.me/BotFather) → `/newbot` → получить токен.
2. Узнать `chat_id` через [@userinfobot](https://t.me/userinfobot) (или ID канала/группы для заявок).

## Что дальше

- **Этап 3** — единый Nginx как reverse-proxy перед client (статика) и server (`/api/*`),
  прод-конфигурация docker-compose, HTTPS.
- **На перспективу** — раздел с веб-картой сервера (Dynmap/BlueMap) как iframe-секция;
  админ-панель для модерации заявок и загрузки материалов без прямого доступа к БД.

## Примечания по Best Practices, заложенным в код

**Backend:**
- Кеширование YouTube API (TTL-кеш в памяти) — защита от исчерпания квоты.
- Фоновая отправка в Telegram (`BackgroundTasks`) со своей сессией БД — не блокирует ответ клиенту.
- Pydantic-валидация на входе, явный CORS whitelist вместо `["*"]`.

**Frontend:**
- Единый API-клиент (`services/api.js`) с `ApiError` — все компоненты обрабатывают ошибки одинаково.
- Скелетоны и явные состояния `loading/ready/error/empty` в каждом разделе, а не просто спиннер.
- Валидация формы на клиенте дублирует, но не заменяет серверную — сообщения об ошибках сервера
  показываются пользователю as is.
- Дизайн-токены (цвета, шрифты, свечение) вынесены в `tailwind.config.js`, а не разбросаны по классам.
