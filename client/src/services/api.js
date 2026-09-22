/**
 * API-клиент для backend'а 0x00 SPACE.
 * Базовый URL берётся из переменной окружения VITE_API_BASE_URL,
 * с фолбэком на локальный dev-сервер FastAPI.
 */
import { videoSchema, videosSchema } from "../lib/schemas.js";
import { captureError } from "../lib/monitoring.js";
// В production Vercel не должен молча обращаться к localhost пользователя.
// Same-origin fallback также позволяет подключить API через reverse proxy.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");
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
  const timeoutSignal =
    typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(15000) : undefined;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal || timeoutSignal,
    });
  } catch (error) {
    captureError(error, { source: path, error_type: "network" });
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new ApiError("Сервер просыпается. Попробуйте ещё раз через несколько секунд.", 408);
    }
    throw error;
  }

  if (!response.ok) {
    const messages = {
      401: "Нужна авторизация администратора.",
      404: "Запрошенные данные не найдены.",
      500: "Сервер временно недоступен. Попробуйте ещё раз позже.",
    };
    let detail = messages[response.status] || `Запрос завершился с ошибкой ${response.status}`;
    try {
      const errorBody = await response.json();
      const detailText = (value) => {
        if (typeof value === "string") return value;
        if (Array.isArray(value))
          return value
            .map((item) => item?.msg)
            .filter(Boolean)
            .join("; ");
        return "";
      };
      const parsedDetail = detailText(errorBody?.detail);
      if (parsedDetail && response.status < 500) detail = parsedDetail;
    } catch {
      // Тело ответа не JSON — оставляем сообщение по умолчанию
    }
    const error = new ApiError(detail, response.status);
    captureError(error, { source: path, status: response.status, error_type: "api" });
    throw error;
  }

  // Ответы 204 (нет тела) обрабатываем отдельно, чтобы не падать на .json()
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const error = new ApiError(
      "Сервис вернул некорректный ответ. Проверьте адрес API.",
      response.status,
    );
    captureError(error, { source: path, status: response.status, error_type: "invalid_response" });
    throw error;
  }
  return response.json();
}

/** GET /api/youtube/latest — последние видео/Shorts канала. */
export function getLatestVideos(limit = 12) {
  return request(`/youtube/latest?limit=${limit}`).then((data) =>
    Array.isArray(data)
      ? data.flatMap((item) => {
          const parsed = videoSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        })
      : videosSchema.parse(data),
  );
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
export function checkAdmin() {
  return request("/auth/check");
}
export function logoutAdmin() {
  return request("/auth/logout", { method: "POST" });
}

export const LATEST_VIDEOS_QUERY_KEY = ["videos", "latest"];
export const BACKGROUNDS_QUERY_KEY = ["backgrounds"];
export const BACKGROUNDS_QUERY_OPTIONS = {
  queryKey: BACKGROUNDS_QUERY_KEY,
  queryFn: getBackgrounds,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
};

/** GET /api/resources — материалы с optional server-side pagination. */
export function getResources(resourceType, gameCategory, options = {}) {
  const params = new URLSearchParams();
  if (resourceType) params.set("resource_type", resourceType);
  if (gameCategory) params.set("game_category", gameCategory);
  if (options.search) params.set("search", options.search);
  if (options.sort) params.set("sort", options.sort);
  if (options.page != null) params.set("page", options.page);
  if (options.limit != null) params.set("limit", options.limit);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/resources${query}`);
}

/** GET /api/seeds — интересные сиды миров с optional pagination. */
export function getSeeds(options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.sort) params.set("sort", options.sort);
  if (options.page != null) params.set("page", options.page);
  if (options.limit != null) params.set("limit", options.limit);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/seeds${query}`);
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

export function getEvents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.game) params.set("game", filters.game);
  if (filters.status) params.set("status", filters.status);
  if (filters.page != null) params.set("page", filters.page);
  if (filters.limit != null) params.set("limit", filters.limit);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/events${query}`);
}
