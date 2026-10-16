# Token Gateway: Specification

Version 1.1 · 2026-10-16 · Owner: TAC service line · Status: Build specification; APISIX baseline, production rollout subject to staging validation

Read with `instructions.md`, `PRD.md` (S8), `ARCHITECTURE.md` (sections 2, 8 and 12), and `API_AND_DATA.md` (sections 1 and 14).

## 1. Purpose and boundaries

The Token Gateway is the single entry point for web and mobile clients using the Opus Tokenization Accelerator Suite. It is an API gateway responsible for routing, access policy, client compatibility, traffic controls, and request-level observability. It forwards requests to domain services and carries identity and request context; it does not interpret tokenization business rules.

It holds no balances, makes no compliance or risk decisions, stores no private keys, and never calls a blockchain node directly. Stablecoin eligibility, address validation, wallet limits, quote expiry, ownership checks, and compliance decisions belong to the domain services. The gateway may apply transport-level checks such as authentication, scopes, body size, content type, rate limits, and client version.

Terminology: "token" refers to tokenized assets and stablecoins. It does not mean OIDC access tokens, although the gateway does validate those.

## 2. Capabilities and acceptance criteria

Each capability has an ID used in tests, tickets and `BUILD_PLAN.md`.

**TG-01 Route table and proxying.** All public paths are defined in one route table (`packages/shared/routes.ts`) that lists the path prefix, upstream, required scopes, rate limit class and mobile flag. The gateway configuration is generated from that table. Acceptance: a contract test fails if the table differs from section 14 of `API_AND_DATA.md`; a path not in the table returns 404 without contacting any upstream.

**TG-02 Authentication.** Validates OIDC access tokens: signature (keys fetched from the identity provider's JWKS endpoint and cached), issuer, audience and expiry, with a clock skew of no more than 60 seconds. Acceptance: expired, wrong-audience and unsigned tokens return 401 with no upstream call; JWKS rotation is handled without restart.

**TG-03 Authorisation by scope.** Each route declares required scopes; the gateway checks them before forwarding. Role checks that depend on resource ownership stay in the services. Acceptance: missing scope returns 403; the scope check is covered by the route table test.

**TG-04 Version gate and client headers.** Requires `X-Client-Platform` (web, ios, android) and `X-Client-Version`. Missing or below-minimum headers return 426 Upgrade Required with the platform minimum in the problem body; an unsupported platform or malformed version returns 400. Acceptance: tested for each platform at, just below and above the minimum, plus missing and malformed headers.

**TG-05 Idempotency header policy.** Route metadata marks state-changing endpoints as requiring `Idempotency-Key`; the documented pure POST operations are exempt. The gateway forwards the key unchanged and rejects a missing key on required routes. It does not cache command responses or own idempotency records. The API service persists keys and enforces replay, body-mismatch, concurrency, and expiry semantics. Acceptance: a gateway integration test confirms required-key routes reject a missing key and forward a valid key; API contract tests prove same-body replay, different-body 422, concurrent 409, and 24-hour expiry behavior.

**TG-06 Rate limiting and quotas.** Limits per user, per device and per client application, stored in Redis so they hold across gateway instances. Route-specific quotas must match section 11 of `API_AND_DATA.md` for quote creation, wallet registration, deployment start, and export creation. Acceptance: each limit dimension is exercised independently and in combination; limit breach returns 429 with `Retry-After`; limits remain consistent when gateway tasks scale or restart.

**TG-07 Transport-level request validation.** Enforce per-route body-size limits (64 KB default, configurable), supported content types, and valid JSON syntax where applicable. Do not duplicate domain validation for chain identifiers, decimal precision, wallet addresses, eligibility, or business state; the API service owns those schemas and remains authoritative. Acceptance: oversized bodies, unsupported content types, and malformed JSON are rejected before forwarding; domain-invalid requests reach the API and receive its documented validation response.

**TG-08 Response aggregation (deferred).** Backend-for-frontend aggregation is not part of v1. Any proposed aggregate endpoint must first be added to the PRD and API/data contracts, including its data sources, authorization rules, partial-failure response, latency budget, and mobile use case. It must not be implemented as an undocumented gateway route.

**TG-09 Real-time transaction status (deferred).** WebSocket/SSE streaming is not part of v1. Before implementation, define it in the PRD and API/data contracts, including authenticated connection setup, transaction ownership checks, event schema, reconnect/replay behavior, token expiry, delivery latency, and an SSE-safe authentication mechanism. A bearer token must not be sent in a URL or accepted only after an unauthenticated connection is opened.

**TG-10 Resilience.** Per-upstream timeouts, circuit breakers, and retries only on safe methods or writes whose idempotency is enforced by the API service. Use jittered backoff within a bounded request budget. Return the documented problem response with 503, `Retry-After`, and a stable error code when an upstream is unavailable. Acceptance: with the Wallet Adapter stopped, the gateway returns the degraded response within 1 second and other routes are unaffected; a failed write is never replayed by the gateway unless its idempotency key is enforced upstream.

**TG-11 Observability and access audit.** Request ID generated or propagated on every request (`X-Request-Id`); traces across the gateway and upstreams; metrics by route, client platform and version; an access log with route, status, latency, client platform and request ID. Acceptance: no request or response body, token, or full wallet address appears in any log (checked by a log scan test).

**TG-12 Security controls.** TLS 1.2 or later on every public and private network hop, with upstream certificates verified; CORS allow-list of web origins; security headers on responses; WAF rules in front; no server version or stack trace in responses. JWKS contains public verification keys and is fetched from the configured OIDC issuer; it is not a secret. Store Redis credentials and other credentials in Secrets Manager. Acceptance: a security test suite covers CORS, TLS configuration, header and error-leak checks and runs in CI.

**TG-13 Versioning and deprecation (later phase).** Continue `/v1` path versioning. Adopt a deprecation notice period and `Sunset` response header policy when API lifecycle requirements are approved. The initial 90-day proposal is not a v1 acceptance requirement. Any deprecated route must be recorded in the route table and release notes.

**TG-14 Partner access (later phase).** API keys with usage plans, webhooks to institutional clients with signed payloads and retries, and a developer portal. Acceptance is defined when this phase starts.

## 3. Open-source gateway choice

The technical recommendation is **Apache APISIX**, deployed as a gateway data plane on ECS using standalone file-driven configuration. This fits the suite's current ECS direction and avoids making a production etcd cluster a prerequisite. Pin the APISIX image and configuration schema; publish route changes through reviewed, immutable deployment artifacts. If supported APISIX plugins cannot meet the required identity-based rate limits, evaluate a small external rate-limit service before writing a custom in-process plugin.

License and product-edition checks below were verified against official project repositories and vendor documentation on 2026-10-16. These checks identify the gateway project's license; they are not a legal review of transitive dependencies or trademark use.

| Candidate | Verified project license | Fit and constraints |
|---|---|---|
| **Apache APISIX** | Apache-2.0 | OIDC, JWT, Redis-backed rate limiting, and WebSocket proxy options are documented. Supports etcd-backed modes and standalone file-driven mode. Selected recommendation for the current ECS direction. [License](https://github.com/apache/apisix/blob/master/LICENSE) · [Architecture](https://apisix.apache.org/docs/apisix/architecture-design/apisix/) |
| **Kong Gateway OSS** | Apache-2.0 for the core repository. The OpenID Connect plugin is Enterprise, not an OSS-only equivalent. [License](https://github.com/Kong/kong/blob/master/LICENSE) · [OIDC edition requirement](https://docs.konghq.com/kubernetes-ingress-controller/latest/plugins/oidc/) |
| **KrakenD Community Edition** | Apache-2.0. Its official repository describes aggregation, JWT, rate limiting, and circuit-breaker features; validate any WebSocket requirement separately. [License and capabilities](https://github.com/krakend/krakend-ce) |
| **Envoy Gateway** | Apache-2.0. It is designed around Gateway API resources and Kubernetes-managed configuration; its global rate limiting uses an external Rate Limit Service and datastore. [License](https://github.com/envoyproxy/gateway/blob/main/LICENSE) · [Rate limiting](https://gateway.envoyproxy.io/docs/concepts/rate-limiting/) |

The project licenses listed above are verified. Dependency notices and license compatibility still require the normal software bill-of-materials review before release. APISIX supports both etcd-backed deployments and standalone file-driven configuration; etcd is not mandatory for the proposed ECS deployment. [APISIX deployment modes](https://apisix.apache.org/docs/apisix/deployment-modes/). Production security still requires validating image provenance, plugin versions, TLS settings, and configuration-update behavior.

The APISIX recommendation and ECS standalone deployment model are recorded in `docs/DECISIONS.md`. Architecture and implementation documents use the same recommendation. If the architecture owner selects another product or configuration model, update this specification and decision record before implementation.

## 4. Architecture

Layers, from the outside in: AWS WAF and the public Application Load Balancer; the APISIX gateway tasks in private subnets; the API/domain services, also on private subnets. TLS 1.2 or later is used on every hop, with upstream certificates verified. Security groups ensure domain services accept client traffic only from the gateway path.

Do not create `apps/gateway-ext` for v1. No aggregation or real-time channel is in the v1 contract. Add a separate service only if a later approved requirement needs custom orchestration outside APISIX.

Configuration is code. The route table, plugin settings and rate-limit classes live in the repository and generate the APISIX standalone configuration artifact. Changes go through pull request review, the contract test in TG-01, and the same deployment pipeline as the services. The gateway never gets its configuration from a manual console change in staging or production.

Deployment: at least two gateway tasks per production environment across two availability zones; auto-scaling on requests per second and CPU. Redis (ElastiCache) is used for distributed rate-limit counters only. APISIX standalone file-driven mode avoids a networked etcd dependency; the ECS deployment rolls forward and back with versioned configuration artifacts. Confirm this mode's multi-instance reload and rollout behavior in a staging spike before production.

## 5. Idempotency design (TG-05)

The API contract in `API_AND_DATA.md` is authoritative: state-changing endpoints require `Idempotency-Key` (with listed pure POST exceptions), and the API service stores idempotency state in `idempotency_keys`. The key is scoped to tenant, authenticated user, method/path, and key value; the API stores a request-body hash with the result. Same-key/same-body requests replay the original response for 24 hours; same-key/different-body returns 422; in-flight duplicates return 409 with `Retry-After`. The gateway forwards the header and enforces the required-key metadata but does not store or replay response bodies. The API implementation must specify which responses are persisted and how datastore loss is handled before write endpoints ship.

## 6. Real-time status channel design (TG-09)

WebSocket and SSE behavior is deferred. Before adding either transport, define it in `PRD.md` and `API_AND_DATA.md`. Require authenticated connection establishment, server-side ownership validation, a minimal event schema, reconnect/replay semantics, and a safe SSE authentication method. Do not pass bearer tokens in URLs or allow unauthenticated long-lived connections.

## 7. Mobile specifics

Mobile clients send the platform headers on every request. Access tokens are short-lived; refresh-token storage and rotation are the responsibility of the identity provider and mobile application [VERIFY with the mobile team]. The gateway does not receive refresh tokens. Push tokens are registered through `/v1/notifications/devices` and revoked on logout.

Mobile routes are marked in the route table. Routes with `mobile: false` (audit, compliance, deployments, selector) return 403 when the client platform is ios or android, whatever the user's scopes. This keeps the mobile attack surface small.

Wallet ownership signatures are a Wallet Adapter concern, not a gateway responsibility. The signing connection method remains [VERIFY] per wallet type in S2.

## 8. Route table extensions

Section 14 of `API_AND_DATA.md` lists route prefixes and the shared route metadata. Entries in `packages/shared/routes.ts` include HTTP method/path match, upstream, scopes, `rateClass`, idempotency policy (`required` or `none`), and mobile allowance. The route contract test verifies the policy against the state-changing/pure-POST rules in `API_AND_DATA.md`. A `sunset` value is used only for a route formally marked deprecated.

## 9. Observability and operations

Dashboards: requests and error rates by route and client platform; latency at p50, p95 and p99 for the gateway itself and for each upstream; circuit breaker state; rate-limit rejections by class and identity dimension; version-gate rejections by platform and version. Idempotency replay metrics are emitted by the API service, not the gateway.

Alerts: error rate above 2% for 5 minutes on any route group; any circuit open for more than 2 minutes; Redis unavailable; version rejections above a set rate for a platform (possible bad release); p95 gateway overhead above 50 ms (PRD NFR).

Runbooks in `docs/runbooks/`: upstream outage, Redis failover, JWKS fetch failure, forced client upgrade, and rollback of a route table change.

## 10. Testing

Contract tests: the route table against section 14 of the API document (TG-01), plus request/response pass-through against each upstream OpenAPI description.

Security tests: token cases (expired, wrong audience, unsigned, algorithm downgrade), scope cases, CORS, header and error-leak checks, and log scanning for secrets (TG-11, TG-12). Run in CI on every change to the gateway configuration.

Load tests: at twice the expected peak, with the latency target of 50 ms gateway overhead at p95.

Chaos tests: stop each upstream in turn in staging and verify TG-10 behaviour. Kill one gateway instance during a load test and verify no failed requests beyond the retry budget.

Rate-limit tests: per-user, per-device, and per-client-app limits across multiple gateway tasks. Idempotency semantics are tested at the API service boundary, including concurrent duplicates, body mismatch, upstream failure, and datastore loss.

## 11. Phases and build tasks

Phase 0 and 1: the APISIX ECS deployment, generated route configuration, OIDC validation and scopes, version gate, request IDs, transport validation, CORS, access logging, and route contract tests. These map to F0-08 and F1-05 to F1-07 in `BUILD_PLAN.md`.

Phase 2: Redis-backed identity-dimension rate limits and gateway resilience (G8-02 and G8-05). Domain idempotency remains in the API service and is implemented with the write endpoints that need it.

Deferred pending product/API approval: TG-08 aggregation and TG-09 real-time status. Later lifecycle work: TG-13 deprecation policy and TG-14 partner access. Mutual TLS to upstreams is added only if the security review requires it.

## 12. Decisions and open questions

1. Confirm APISIX standalone file-driven configuration rollout and multi-task behavior in staging before production. Owner: architecture lead.
2. Confirm APISIX plugin versions and prove per-user, per-device, and per-app Redis-backed rate limits in a staging spike. If a custom component is needed, record and threat-model it before implementation.
3. Mobile token storage and certificate pinning. Owner: mobile lead [VERIFY].
4. Step-up authentication threshold and method for high-value actions. Owner: security with compliance [VERIFY].
5. Which mobile routes are allowed in the first mobile release. Owner: product.
6. Any future aggregation or real-time status requirement must be approved and documented in the PRD and API contract before adding routes.
