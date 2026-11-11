import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { checkApi } from "../scripts/check-api-links.mjs";

let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/api/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.url.startsWith("/api/resources?")) {
      response.writeHead(200, { "content-type": "application/json" });
      const fileBaseUrl = baseUrl.replace(/\/api$/, "");
      response.end(
        JSON.stringify({
          items: [
            { title: "HEAD works", download_url: `${fileBaseUrl}/files/head-ok` },
            { title: "GET fallback", download_url: `${fileBaseUrl}/files/get-only` },
            { title: "Dead link", download_url: `${fileBaseUrl}/files/missing` },
            { title: "Unsafe link", download_url: "javascript:alert(1)" },
          ],
          has_next: false,
        }),
      );
      return;
    }
    if (request.url === "/files/head-ok") {
      response.writeHead(200);
      response.end();
      return;
    }
    if (request.url === "/files/get-only" && request.method === "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }
    if (request.url === "/files/get-only") {
      response.writeHead(206);
      response.end("x");
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("checks API, paginated resources, HEAD fallback, dead and invalid links", async () => {
  const logs = [];
  const result = await checkApi({ apiBaseUrl: baseUrl, log: (line) => logs.push(line) });

  assert.equal(result.health.status, "ok");
  assert.equal(result.checked, 3);
  assert.equal(result.issues.length, 2);
  assert.ok(logs.includes("PASS API health: ok"));
  assert.ok(result.issues.some((issue) => issue.includes("Dead link") && issue.includes("404")));
  assert.ok(result.issues.some((issue) => issue.includes("Unsafe link") && issue.includes("invalid")));
});

test("reports degraded health and skips catalog requests", async () => {
  const requests = [];
  const result = await checkApi({
    apiBaseUrl: baseUrl,
    fetchImpl: async (input, init) => {
      requests.push(String(input));
      if (String(input).endsWith("/health")) {
        return Response.json({ status: "degraded" });
      }
      return fetch(input, init);
    },
    log: () => {},
  });

  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /degraded/);
  assert.equal(requests.length, 1);
});
