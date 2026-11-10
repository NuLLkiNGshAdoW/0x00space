# Подключение сайта к поисковикам

Техническая подготовка уже встроена в проект: `robots.txt`, sitemap с последними видео, JSON-LD, метаданные страниц, verification-теги и IndexNow.

## 1. Опубликовать изменения

Задеплойте текущую версию на Vercel. В настройках проекта задайте:

- `VITE_SITE_URL=https://0x00space.vercel.app`
- `VITE_API_BASE_URL=https://zerox00space-api.onrender.com/api` (если это адрес API в текущем Vercel deployment)
- коды подтверждения из разделов ниже

После каждого изменения Vercel Environment Variables нужен новый deployment. Проверить результат:

- `https://0x00space.vercel.app/robots.txt`
- `https://0x00space.vercel.app/sitemap.xml`
- `https://0x00space.vercel.app/5b0af8af5357294799ecb9f01af3e988.txt`

Sitemap обновляется при сборке и включает страницы сайта и до 50 последних роликов, полученных из API. Если API во время сборки недоступен, остаётся базовый sitemap; следующий deployment повторит загрузку.

## 2. Google Search Console

1. Откройте [Google Search Console](https://search.google.com/search-console/).
2. Добавьте ресурс типа **Префикс URL**: `https://0x00space.vercel.app`.
3. Выберите способ **HTML-тег**. Скопируйте только значение `content`.
4. Добавьте его в Vercel как `VITE_GOOGLE_SITE_VERIFICATION` и задеплойте.
5. Нажмите «Подтвердить», затем откройте раздел **Файлы Sitemap** и отправьте `https://0x00space.vercel.app/sitemap.xml`.
6. Через **Проверка URL** запросите индексирование главной, `/videos`, `/materials`, `/events` и нескольких адресов видео.

## 3. Bing и Яндекс

- **Bing Webmaster Tools**: добавьте сайт или импортируйте ресурс из Google Search Console. Для HTML-подтверждения задайте `VITE_BING_SITE_VERIFICATION`. Отправьте тот же sitemap.
- **Яндекс Вебмастер**: добавьте `https://0x00space.vercel.app`, выберите подтверждение через meta-тег, задайте значение `VITE_YANDEX_VERIFICATION` и отправьте sitemap.

После публикации файла IndexNow и sitemap запустите из папки `client`:

```bash
npm run seo:indexnow
```

Скрипт проверяет, что публичный ключ уже доступен на сайте, затем отправляет URL из sitemap в IndexNow (Bing и поддерживающие протокол поисковики). Google IndexNow не использует — для Google нужны Search Console и обычный обход сайта.

## Важно

Подтверждение и отправка sitemap сообщают поисковику о сайте, но не гарантируют конкретную позицию или мгновенное появление в результатах. Индексация может занять от нескольких дней до нескольких недель; на позиции влияют полезность и оригинальность материалов, конкуренция и ссылки на сайт.
