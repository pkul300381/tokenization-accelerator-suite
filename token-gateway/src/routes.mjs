// Public route families from API_AND_DATA.md section 14.
export const routes = Object.freeze([
  { id: "catalogue", prefix: "/v1/catalogue", upstream: "api", scopes: ["catalogue.read"], mobile: true },
  { id: "selector", prefix: "/v1/selector", upstream: "api", scopes: ["selector.read", "selector.write"], mobile: false },
  { id: "wallets", prefix: "/v1/wallets", upstream: "api", scopes: ["wallets.read", "wallets.write"], mobile: true },
  { id: "fx", prefix: "/v1/fx", upstream: "api", scopes: ["fx.read", "fx.execute"], mobile: true },
  { id: "gas", prefix: "/v1/gas", upstream: "api", scopes: ["gas.read"], mobile: true },
  { id: "audit", prefix: "/v1/audit", upstream: "api", scopes: ["audit.read"], mobile: false },
  { id: "compliance", prefix: "/v1/compliance", upstream: "api", scopes: ["compliance.read", "compliance.decide"], mobile: false },
  { id: "notifications", prefix: "/v1/notifications", upstream: "api", scopes: ["notifications.read", "notifications.ack"], mobile: true },
  { id: "deployments", prefix: "/v1/deployments", upstream: "api", scopes: ["deploy.start", "deploy.read"], mobile: false }
]);

export const publicGatewayPaths = Object.freeze([
  "/v1/gateway/health",
  "/v1/gateway/version"
]);
