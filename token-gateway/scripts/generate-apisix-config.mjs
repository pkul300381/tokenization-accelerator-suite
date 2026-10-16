import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { routes } from "../src/routes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDir = path.join(root, "config");
await mkdir(configDir, { recursive: true });

const apisixConfig = {
  routes: routes.flatMap((route) => [route.prefix, `${route.prefix}/*`].map((uri, index) => ({
    id: `opus-${route.id}${index === 0 ? "-root" : ""}`,
    name: `Opus ${route.id} API route`,
    uri,
    priority: 10,
    plugins: {
      "openid-connect": {
        client_id: "${{OIDC_CLIENT_ID}}",
        client_secret: "${{OIDC_CLIENT_SECRET}}",
        discovery: "${{OIDC_DISCOVERY_URL}}",
        bearer_only: true,
        set_access_token_header: false,
        set_userinfo_header: false
      },
      "request-id": { header_name: "X-Request-Id", include_in_response: true },
      "proxy-rewrite": { headers: { "X-Opus-Route-Id": route.id } }
    },
    upstream: {
      type: "roundrobin",
      nodes: { "${{API_UPSTREAM}}": 1 },
      timeout: { connect: 1, send: 5, read: 5 }
    },
    status: 1,
  })))
};

await writeFile(path.join(configDir, "apisix.json"), `${JSON.stringify(apisixConfig, null, 2)}\n`);
console.log(`Generated ${apisixConfig.routes.length} APISIX routes in config/apisix.json`);
