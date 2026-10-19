# Token Gateway starter

This sub-project is the first runnable configuration layer for the Token Gateway. It uses the official, version-pinned Apache APISIX image in standalone file-driven mode and keeps the public route-family list in `src/routes.mjs`. `scripts/generate-apisix-config.mjs` emits the APISIX JSON configuration consumed at startup.

## Prerequisites

- Node.js 20 or newer
- Docker with Docker Compose
- An OIDC provider and an API service reachable from the APISIX container

## Generate and test

```sh
npm run generate
npm test
```

The tests use Node's built-in test runner; no npm packages are required. The generated file is ignored by git and should be produced as part of local startup/build.

## Start APISIX

From this directory, set `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_DISCOVERY_URL`, then run:

```sh
npm run generate
docker compose up
```

The listener is bound to `127.0.0.1:9080`. `API_UPSTREAM` defaults to `host.docker.internal:8080`; set it to the API host and port reachable from the container. No Admin API port is published. The gateway routes require bearer OIDC authentication and add a request ID before forwarding.

## Scope of this starter

This implements the route-family foundation and executable policy helpers for route resolution, version checks, scope/mobile checks, and idempotency-key classification. The APISIX config currently wires OIDC bearer authentication, request IDs, and proxying. The policy helpers are unit tested, but are not yet wired into APISIX request processing; gateway health/version endpoints are also not implemented. Before treating this as a complete gateway, implement and integration-test the health/version endpoints, version gate, scope/mobile enforcement, idempotency header enforcement, body/content-type limits, user/device/application Redis quotas, TLS/CORS, and body-free access logging. The API contract lists scope alternatives by family, so authorization must become method-specific before production.

APISIX image licensing and source links are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Review the image SBOM and transitive licenses during release preparation.
