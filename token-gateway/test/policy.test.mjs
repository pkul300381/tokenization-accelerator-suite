import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { routes } from "../src/routes.mjs";
import { checkClientVersion, checkRouteAccess, requiresIdempotencyKey, resolveRoute } from "../src/policy.mjs";

test("route families match the API contract's public gateway route list", async () => {
  const api = await readFile(new URL("../../docs/API_AND_DATA.md", import.meta.url), "utf8");
  const table = api.split("## 14. Token Gateway")[1].split("\n## ")[0];
  const documented = [...table.matchAll(/^\| `(\/v1\/[a-z-]+)` \|/gm)].map((match) => match[1]).filter((path) => path !== "/v1/gateway").sort();
  assert.deepEqual(routes.map(({ prefix }) => prefix).sort(), documented);
});

test("route resolution is prefix-bounded and unknown paths remain closed", () => {
  assert.equal(resolveRoute("/v1/wallets/wal_1").id, "wallets");
  assert.equal(resolveRoute("/v1/wallets-evil"), null);
  assert.equal(resolveRoute("/v1/not-a-route"), null);
  assert.equal(resolveRoute("/v1/gateway/health").kind, "public");
});

test("mobile restrictions and route scopes are applied", () => {
  const selector = resolveRoute("/v1/selector/configurations");
  assert.equal(checkRouteAccess(selector, { platform: "ios", scopes: ["selector.write"] }).status, 403);
  assert.equal(checkRouteAccess(selector, { platform: "web", scopes: ["selector.write"] }).allowed, true);
  assert.equal(checkRouteAccess(selector, { platform: "web", scopes: ["gas.read"] }).status, 403);
});

test("client version gate handles missing, malformed, below-minimum and supported versions", () => {
  const minimums = { web: "1.0.0", ios: "1.4.0", android: "1.3.0" };
  assert.equal(checkClientVersion({}, minimums).status, 426);
  assert.equal(checkClientVersion({ "x-client-platform": "tablet", "x-client-version": "1.0.0" }, minimums).status, 400);
  assert.equal(checkClientVersion({ "x-client-platform": "ios", "x-client-version": "1.4" }, minimums).status, 400);
  assert.equal(checkClientVersion({ "x-client-platform": "ios", "x-client-version": "1.3.9" }, minimums).status, 426);
  assert.equal(checkClientVersion({ "x-client-platform": "ios", "x-client-version": "1.4.0" }, minimums).allowed, true);
});

test("idempotency policy exempts documented pure POST operations", () => {
  assert.equal(requiresIdempotencyKey("POST", "/v1/selector/configurations/cfg-1/validate"), false);
  assert.equal(requiresIdempotencyKey("POST", "/v1/gas/estimate"), false);
  assert.equal(requiresIdempotencyKey("POST", "/v1/compliance/evaluate"), false);
  assert.equal(requiresIdempotencyKey("POST", "/v1/fx/quotes"), true);
  assert.equal(requiresIdempotencyKey("GET", "/v1/wallets"), false);
});

test("generated config uses APISIX file-driven data-plane mode and enables bearer OIDC", async () => {
  const config = JSON.parse(await readFile(new URL("../config/apisix.json", import.meta.url), "utf8"));
  assert.equal(config.routes.length, routes.length * 2);
  assert.ok(routes.every(({ prefix }) => config.routes.some((route) => route.uri === prefix)));
  assert.ok(routes.every(({ prefix }) => config.routes.some((route) => route.uri === `${prefix}/*`)));
  assert.ok(config.routes.every((route) => route.plugins["openid-connect"].bearer_only === true));
  assert.ok(config.routes.every((route) => route.plugins["request-id"]));
});
