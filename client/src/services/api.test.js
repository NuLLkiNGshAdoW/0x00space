import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_BASE_URL, ApiError, getApiErrorState, loginAdmin, request } from "./api.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  };
}

describe("request", () => {
  it("sends the administrator username and password in the login request", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async () =>
      jsonResponse({ authenticated: true, username: "test-admin" }),
    );

    await loginAdmin("test-admin", "test-password");

    assert.equal(fetch.mock.calls[0].arguments[0], `${API_BASE_URL}/auth/login`);
    assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body), {
      username: "test-admin",
      password: "test-password",
    });
    assert.equal(fetch.mock.calls[0].arguments[1].credentials, "include");
  });

  it("sends JSON requests with same-site credentials", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async () => jsonResponse({ ok: true }));

    const result = await request("/applications", {
      method: "POST",
      body: JSON.stringify({ nickname: "Steve" }),
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(fetch.mock.calls.length, 1);
    assert.equal(fetch.mock.calls[0].arguments[0], `${API_BASE_URL}/applications`);
    assert.equal(fetch.mock.calls[0].arguments[1].method, "POST");
    assert.equal(fetch.mock.calls[0].arguments[1].credentials, "include");
    assert.equal(fetch.mock.calls[0].arguments[1].headers["Content-Type"], "application/json");
  });

  it("returns null for an empty 204 response", async (t) => {
    t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 204 }));

    assert.equal(await request("/admin/resources/123", { method: "DELETE" }), null);
  });

  it("uses validation details from client errors", async (t) => {
    t.mock.method(globalThis, "fetch", async () =>
      jsonResponse({ detail: [{ msg: "nickname is required" }] }, 422),
    );

    await assert.rejects(request("/applications"), {
      name: "ApiError",
      message: "nickname is required",
      status: 422,
    });
  });

  it("does not expose server error details", async (t) => {
    t.mock.method(globalThis, "fetch", async () =>
      jsonResponse({ detail: "internal database details" }, 500),
    );

    await assert.rejects(request("/resources"), {
      message: "Сервер временно недоступен. Попробуйте ещё раз позже.",
      status: 500,
    });
  });

  it("converts network failures into ApiError with status zero", async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    await assert.rejects(request("/resources"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.message, "Не удалось подключиться к серверу.");
      assert.equal(error.status, 0);
      return true;
    });
  });

  it("rejects successful responses that are not JSON", async (t) => {
    t.mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
    }));

    await assert.rejects(request("/resources"), {
      message: "Сервис вернул некорректный ответ. Проверьте адрес API.",
      status: 200,
    });
  });
});

describe("getApiErrorState", () => {
  const statuses = [
    [0, "network"],
    [408, "waking"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [429, "rate-limit"],
    [500, "server"],
  ];

  for (const [status, state] of statuses) {
    it(`maps HTTP status ${status} to ${state}`, () => {
      assert.equal(getApiErrorState(new ApiError("error", status)), state);
    });
  }
});
