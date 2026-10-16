# Architecture Decisions

Decisions for the Opus Tokenization Accelerator Suite. Update this file when a decision changes.

## DEC-001: Token Gateway product and deployment model

- **Status:** Accepted as the v1 build baseline; validate in staging before production.
- **Date:** 2026-10-16
- **Decision:** Use Apache APISIX as the Token Gateway data plane on ECS, with standalone file-driven configuration generated from `packages/shared/routes.ts`.
- **Context:** The suite's baseline runs services on ECS. The gateway needs OIDC validation, route scopes, distributed user/device/client rate limits, a version gate, request IDs, and body-free access logs. APISIX is open source under Apache-2.0 and supports OIDC/rate-limit plugins. Its etcd-backed modes are not required when using standalone file-driven configuration.
- **Consequences:** The team owns APISIX image/version pinning, configuration schema validation, ECS rollout/rollback, and plugin compatibility. Redis (ElastiCache) is used for distributed rate-limit counters. No APISIX Admin API is exposed publicly. The staging spike must validate multi-task config rollout, plugin availability, rate limits across tasks, OIDC key rotation, and the 50 ms p95 gateway overhead target.
- **Alternatives reviewed:** Amazon API Gateway HTTP API; Kong Gateway OSS; KrakenD Community Edition; Envoy Gateway. Kong's OIDC plugin is Enterprise. KrakenD and Envoy Gateway remain viable alternatives if hosting direction changes.
- **License check:** APISIX Apache-2.0, checked against the official repository license on 2026-10-16. This is not a transitive dependency or legal review; run the normal SBOM/license scan before release.
- **References:** [TOKEN_GATEWAY.md](../TOKEN_GATEWAY.md); [Apache APISIX license](https://github.com/apache/apisix/blob/master/LICENSE); [APISIX deployment modes](https://apisix.apache.org/docs/apisix/deployment-modes/).

## DEC-002: Defer gateway aggregation and real-time client streaming

- **Status:** Deferred pending product/API approval.
- **Date:** 2026-10-16
- **Decision:** Do not implement backend-for-frontend aggregation, WebSocket transaction status, or SSE in v1.
- **Context:** These capabilities are not defined in the PRD or API/data contracts and require new ownership, authorization, event, replay, and failure semantics.
- **Consequences:** Add them only after updating `PRD.md`, `API_AND_DATA.md`, and `BUILD_PLAN.md` with agreed use cases and acceptance criteria.
- **References:** [TOKEN_GATEWAY.md](../TOKEN_GATEWAY.md), TG-08 and TG-09.
