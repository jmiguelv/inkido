import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { handler } from "./index.ts";

Deno.test("OPTIONS preflight returns 200 ok with CORS headers", async () => {
  const req = new Request("http://localhost", { method: "OPTIONS" });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("missing Authorization header returns 401", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phrases: ["你好"], language: "zh" })
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, "Missing Authorization header");
});

Deno.test("empty phrases returns empty results", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token"
    },
    body: JSON.stringify({ phrases: [], language: "zh" })
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.results, []);
});

Deno.test("invalid payload returns 500 or handles it (if phrases is not present)", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token"
    },
    body: JSON.stringify({ language: "zh" })
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.results, []);
});
