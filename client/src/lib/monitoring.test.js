import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeContext, sanitizeSentryEvent, shouldCaptureError } from "./monitoring.js";

describe("monitoring event filtering", () => {
  it("reports API server errors but ignores expected client responses", () => {
    assert.equal(shouldCaptureError({ error_type: "api", status: 500 }), true);
    assert.equal(shouldCaptureError({ error_type: "api", status: 401 }), false);
    assert.equal(shouldCaptureError({ error_type: "api", status: 429 }), false);
    assert.equal(shouldCaptureError({ error_type: "network" }), true);
    assert.equal(shouldCaptureError({ error_type: "network" }, { name: "TimeoutError" }), false);
  });

  it("keeps only safe, bounded context labels", () => {
    assert.deepEqual(
      safeContext({
        source: "/api/admin/users/secret-id?token=secret",
        status: 503,
        error_type: "api",
        password: "secret",
      }),
      { source: "api", status: 503, error_type: "api" },
    );
  });

  it("removes request and exception data that could contain user information", () => {
    const event = {
      user: { email: "private@example.test" },
      extra: { password: "secret" },
      breadcrumbs: [{ message: "submitted private form data" }],
      transaction: "/api/users/private-id",
      message: "private exception detail",
      request: {
        method: "POST",
        url: "https://api.example.test/api/users?token=secret",
        headers: { Cookie: "session=secret" },
        data: { password: "secret" },
      },
      exception: { values: [{ type: "ApiError", value: "private server detail" }] },
    };

    assert.deepEqual(sanitizeSentryEvent(event), {
      message: "Client error",
      request: { method: "POST" },
      exception: { values: [{ type: "ApiError", value: "ApiError" }] },
    });
  });
});
