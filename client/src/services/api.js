/**
 * API-клиент для backend'а 0x00 SPACE.
 * Базовый URL берётся из переменной окружения VITE_API_BASE_URL,
 * с фолбэком на локальный dev-сервер FastAPI.
 */
import { videoSchema, videosSchema } from "../lib/schemas.js";
import { captureError } from "../lib/monitoring.js";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

/** Класс ошибки API — хранит HTTP-статус и сообщение от сервера. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Универсальная обёртка над fetch: собирает URL, парсит JSON,
 * бросает ApiError с понятным сообщением при неуспешном ответе.
 */
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      credentials: "include",
      ...options,
    });
  } catch (error) {
    captureError(error, { source: path, error_type: "network" });
    throw error;
  }

  if (!response.ok) {
    const messages = { 401: "Нужна авторизация администратора.", 404: "Запрошенные данные не найдены.", 500: "Сервер временно недоступен. Попробуйте ещё раз позже." };
    let detail = messages[response.status] || `Запрос завершился с ошибкой ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) detail = errorBody.detail;
    } catch {
      // Тело ответа не JSON — оставляем сообщение по умолчанию
    }
    const error = new ApiError(detail, response.status);
    captureError(error, { source: path, status: response.status, error_type: "api" });
    throw error;
  }

  // Ответы 204 (нет тела) обрабатываем отдельно, чтобы не падать на .json()
  if (response.status === 204) return null;
  return response.json();
}

/** GET /api/youtube/latest — последние видео/Shorts канала. */
export function getLatestVideos(limit = 12) {
  return request(`/youtube/latest?limit=${limit}`).then((data) => videosSchema.parse(data));
}

export function getVideo(videoId) {
  return request(`/youtube/${encodeURIComponent(videoId)}`).then((data) => ({
    video: videoSchema.parse(data.video),
    related: videosSchema.parse(data.related),
  }));
}

export function loginAdmin(password) {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
}
export function checkAdmin() { return request("/auth/check"); }
export function logoutAdmin() { return request("/auth/logout", { method: "POST" }); }

export const LATEST_VIDEOS_QUERY_KEY = ["videos", "latest"];

/** GET /api/resources — материалы (текстур-паки, шейдеры, моды), опционально по типу файла и/или игре. */
export function getResources(resourceType, gameCategory) {
  const params = new URLSearchParams();
  if (resourceType) params.set("resource_type", resourceType);
  if (gameCategory) params.set("game_category", gameCategory);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/resources${query}`);
}

/** GET /api/seeds — интересные сиды миров. */
export function getSeeds() {
  return request("/seeds");
}

/** POST /api/applications — отправка заявки подписчика. */
export function submitApplication(payload) {
  return request("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBackgrounds() {
  return request("/backgrounds");
}
