import { routes, publicGatewayPaths } from "./routes.mjs";

export function resolveRoute(path) {
  if (publicGatewayPaths.includes(path)) return { kind: "public", path };
  return routes.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`)) ?? null;
}

export function checkClientVersion(headers, minimums) {
  const platform = headers["x-client-platform"]?.toLowerCase();
  const version = headers["x-client-version"];
  if (!platform || !version) return { allowed: false, status: 426, reason: "client_version_required" };
  if (!["web", "ios", "android"].includes(platform)) {
    return { allowed: false, status: 400, reason: "unsupported_platform" };
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { allowed: false, status: 400, reason: "malformed_version" };
  }
  const minimum = minimums[platform];
  if (!minimum) return { allowed: false, status: 500, reason: "minimum_version_unconfigured" };
  if (compareVersions(version, minimum) < 0) {
    return { allowed: false, status: 426, reason: "upgrade_required", minimum };
  }
  return { allowed: true, platform, version };
}

export function checkRouteAccess(route, { platform, scopes = [] }) {
  if (!route || route.kind === "public") return { allowed: Boolean(route), status: route ? 200 : 404 };
  if (["ios", "android"].includes(platform) && !route.mobile) {
    return { allowed: false, status: 403, reason: "mobile_route_not_allowed" };
  }
  // Section 14 lists acceptable scopes by route family; endpoint-level OR/AND policy
  // must become method-specific when the full API contract is implemented.
  if (!route.scopes.some((scope) => scopes.includes(scope))) {
    return { allowed: false, status: 403, reason: "missing_scope" };
  }
  return { allowed: true, status: 200 };
}

export function requiresIdempotencyKey(method, path) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) return false;
  const purePost = new Set([
    "/v1/selector/configurations/:id/validate",
    "/v1/gas/estimate",
    "/v1/compliance/evaluate"
  ]);
  const normalized = path.replace(/\/[^/]+(?=\/validate$)/, "/:id");
  return !purePost.has(normalized);
}

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
