# Architecture: Opus Tokenization Accelerator Suite

Version 1.0 · 2026-10-16 · Read with `PRD.md` and `API_AND_DATA.md`.

## 1. Context

The suite is a web application used by Opus teams and client teams. It configures tokenization and stablecoin programmes, prices operations, handles conversions through adapters, and records an audit trail. Its later phase deploys the configured infrastructure to AWS.

External systems the suite depends on, all reached through adapters:

- Identity provider (OIDC) for sign-in and roles.
- Custody and signing provider (for example Fireblocks; the adapter is generic) [VERIFY which provider(s) Opus will support].
- Public chain RPC and indexer providers (for example Base, Arbitrum, Polygon, Ethereum, Solana, XRPL) [VERIFY per chain].
- Permissioned ledger nodes (for example Hyperledger Besu, Quorum, Canton Network) [VERIFY per client deployment].
- FX rate and liquidity provider [VERIFY].
- Sanctions screening provider [VERIFY].
- KYC provider (reference identifiers only) [VERIFY].
- Notification channels: e-mail, a chat platform and a paging service [VERIFY which tools Opus and each client use].
- Mobile clients (iOS and Android) calling the Token Gateway, and the push notification service for those clients [VERIFY].
- AWS (sandbox first, production later) for hosting and for deployment automation.

## 2. Logical architecture

```
  Web app (React)                    Mobile apps (iOS, Android)
        |                                       |
        +----------------- HTTPS ----------------+
                            |
          +-----------------v------------------+
          | Token Gateway (apps/gateway)       |  ECS Fargate behind WAF and ALB
          | OIDC check, scopes, rate limits,   |
          | version gate, request IDs, routing |
          +-----------------+------------------+
                            | private network only
          +-----------------v-------------------------------------+
          | API service (apps/api, Fastify)                     |  ECS Fargate
          |  S1 selector    S2 wallets      S3 fx bridge        |
          |  S4 gas engine  S5 audit        S6 compliance & risk|  (called before
          |  S7 notification module (consumer and routing)      |   every value write)
          +-----+------------------+------------------+---------+
                |                  |                  |
          +-----v------+    +------v-----+    +-------v-------------------+
          | RDS        |    | Redis      |    | Event bus                 |
          | PostgreSQL |    | cache,     |    | (EventBridge + SQS;       |
          | + outbox   |    | rate limit |    |  Redis Streams in dev)    |
          +------------+    +------------+    +-------+-------------------+
                                                      |
                                       +--------------v--------------+
                                       | Workers (ECS)               |
                                       |  - chain transaction watcher|
                                       |  - notification delivery    |
                                       |  - report export            |
                                       |  - deployment runs          |
                                       +--------------+--------------+
                                                      |
                             +------------------------v---------------------------+
                             | Adapter layer (each adapter has a real and a mock)|
                             | custody · chain · fx · gas · kyc · screening ·    |
                             | notify (e-mail, chat, paging, push) · aws-deploy  |
                             +---------------------------------------------------+
```

The Token Gateway is the only public entry point. Web and mobile clients never call a domain service directly. The API service calls the Compliance & Risk Engine in-process before each value-moving or configuration write. The chain transaction watcher observes submitted, confirmed and failed transactions through the chain adapter and publishes each change as an event. The Notification Service consumes those events and the compliance decisions that need attention.

The web app is a static single-page application served from object storage behind a CDN. Background workers run the same code base with a different entry point. Adapters are the only place where external systems are called.

## 3. Components

| Component | Responsibility | Notes |
|---|---|---|
| `apps/web` | Suite shell and five service pages | Calls only the public API. No secrets in the bundle. |
| `apps/api` | Business logic, validation, authorisation, audit | One module per service: `selector`, `wallets`, `fx`, `gas`, `audit`, plus `catalogue` and `deployments`. |
| `workers` | Background jobs | Idempotent. Jobs carry an idempotency key. |
| `packages/shared` | Schemas, types, catalogue seed, constants | Single source of truth for contracts. |
| `packages/adapters` | Adapter interfaces and implementations | Real adapters are feature-flagged per environment. |
| `infra/terraform` | AWS environments | Dev, staging, prod in separate accounts. |
| `apps/gateway` | Token Gateway | Route table, OIDC validation, scope checks, rate limits, version gate, request IDs, CORS. No business logic or data storage. Section 12. |
| `apps/api` compliance module | Compliance & Risk Engine (S6) | Rule sets as versioned data, evaluation, decisions, review cases. Section 13. |
| `apps/api` notifications module and `workers` | Notification Service (S7) | Event consumer, routing, dedupe, escalation, delivery through adapters, chain transaction watcher. Section 14. |
| `packages/events` | Event contracts | Event names, payload schemas, outbox writer, idempotent subscriber helper. |

## 4. Adapter design

Each external capability has an interface and at least two implementations: a mock (used in dev, CI and demo mode) and a sandbox or live implementation.

Custody adapter interface (illustrative; the real signature is defined in `packages/adapters/custody.ts`):

- `listSupportedAssets(): Asset[]`
- `listSupportedChains(): Chain[]`
- `createWallet(spec): WalletRef`
- `getWalletStatus(ref): WalletStatus`
- `requestSignature(ref, payload): SignatureRequestRef`
- `getSignatureStatus(requestRef): SignatureStatus`

Chain adapter: `estimateFee(chain, txType, params)`, `getBlockTime(chain)`, `validateAddress(chain, address)`, `getTxStatus(chain, txHash)`.

Each adapter method returns a typed result or a typed error. Adapters never throw raw vendor errors into the domain layer. They map vendor errors to `AdapterError` with a code, a retryable flag, and a correlation ID.

Two adapter families support the platform services. The screening adapter exposes `screenAddress(chain, address)`, which returns the outcome, the list version and a timestamp. The notification adapter exposes `send(channel, message)`, which returns a delivery result; it has implementations for e-mail, a chat webhook, a paging service and push, and the mock writes each message to a local log.

## 5. Ledger options

Two ledger families are supported. The choice is made per programme in the Stablecoin Selector.

**Public layer-2 networks** (for example Base, Arbitrum, Polygon) suit programmes that need open interoperability, broad liquidity and public verifiability. Settlement finality, fees and sequencer decentralisation differ by network and change over time [VERIFY current parameters per network before any recommendation]. Public chains inherit the security of their parent ledger to varying degrees; this must be explained to clients.

**Permissioned ledgers** (for example Hyperledger Besu, Quorum, Canton Network) suit consortium programmes where participants are known and access must be controlled. They offer privacy and governance controls. Their interoperability with public liquidity is limited and must be designed explicitly [VERIFY per platform].

The Stablecoin Selector does not make the recommendation. It shows the trade-offs and records the choice and its rationale in the blueprint.

## 6. Data flow: stablecoin configuration to blueprint

1. The user selects coins. The client requests `GET /v1/catalogue/stablecoins` and receives eligible coins.
2. The user selects a provider. The client requests `GET /v1/catalogue/providers?coins=...` and receives providers with support status and reasons.
3. The user selects a ledger and chain. The client requests `GET /v1/catalogue/ledgers?provider=...`.
4. The user adds wallets. Wallets are created through the wallet service.
5. The user reviews. The client requests `POST /v1/selector/configurations/{id}/validate` and receives the same result the server would store.
6. The user saves. The server writes a new blueprint version and an audit row.
7. Export. `GET /v1/selector/blueprints/{id}/versions/{n}` returns canonical JSON.
8. Later phase: `POST /v1/deployments` with a blueprint version starts a background run.
9. Before any write that moves value or configures a ledger, the API calls the Compliance & Risk Engine. An `allow` continues, a `block` stops the write, and a `review` creates a case in the compliance queue. Each decision is recorded.
10. When a transaction is submitted, confirmed or fails, the chain watcher publishes an event. The Notification Service turns it into an alert for production support, and a failed transaction pages the on-call engineer.

## 7. AWS deployment automation (Phase 4 and later)

The deployment service takes a blueprint and runs these steps as a resumable job:

1. Validate the blueprint again against the current catalogue.
2. Render Terraform modules from templates into a run-specific workspace (no secrets in the workspace).
3. Run `terraform plan` and store the plan summary.
4. Wait for a named approver to approve the plan (two-person rule for production).
5. Apply in the target AWS account using a role assumed through the deployment service's own role. Credentials are short-lived.
6. Record each resource created, its ARN and its status.
7. Run post-deploy checks (health endpoints, custody adapter test, ledger node reachable).
8. Emit an audit event and notify the requester.

Environments: `sandbox` (automatic apply allowed), `staging` (approval required), `production` (two approvals and a change ticket reference). The first release supports sandbox only.

## 8. Security architecture

Identity and access: OIDC sign-in; short-lived sessions; role claims mapped to the RBAC matrix in `PRD.md`. The API validates every token and checks scopes per endpoint.

Network: the Token Gateway is the only service on the public side, behind WAF and the load balancer; the API service, workers and data are in private subnets with no public listeners; security groups allow only required ports; WAF rules for common attacks and rate limits; no public database endpoint.

Data protection: TLS everywhere; KMS customer-managed keys for RDS, S3, Secrets Manager and CloudWatch logs; backups encrypted; key rotation enabled.

Secrets: Secrets Manager for vendor credentials, rotated on a schedule; the application reads them at startup and on rotation, never from environment files in images.

Key material: the application never holds custody keys. Signing is done by the custody provider, or by an HSM or KMS key under the provider's control [VERIFY].

Audit: append-only table, separate database role with insert and select only for the audit schema; logs shipped to a separate account.

Supply chain: lockfile committed; dependency and container scanning in CI; images built from minimal base images; signed images where the platform supports it.

Threat model: maintain a threat model in `docs/THREAT_MODEL.md` covering spoofed quotes, replayed signatures, tampered blueprints, privilege escalation through the catalogue admin role, and export abuse. Review it at each phase exit.

## 9. Observability and operations

Structured JSON logs with request ID, user role (not identity where possible), route and latency. Metrics: request rate, error rate, p95 latency per route, queue depth, job failure rate, adapter error rate by vendor. Platform metrics: gateway requests by client platform and version, version rejections, screening decision counts and latency, notification delivery success and time to deliver, and the age of unacknowledged failure alerts. Alerts on error rate above 2% for 5 minutes, queue depth above a threshold, and any audit write failure. Alerts also fire when a failed-transaction notification is unacknowledged after 15 minutes, and when version rejections rise above a set rate. Runbooks in `docs/runbooks/`.

## 10. Environments and release

Dev: local containers with mock adapters; demo seed on. Staging: sandbox adapters where available, demo seed on, production-like infrastructure. Production: live adapters only when enabled by sign-off, demo seed off.

Release: trunk-based development with short-lived branches; CI on every pull request; deploy to dev on merge; staging on tag; production on approved tag.

## 11. Decisions to record

Record each of these in `docs/DECISIONS.md` when made: frontend framework; API framework; ORM; hosting (ECS or EKS); custody provider shortlist; first public chain and first permissioned ledger; PDF generation library; catalogue ownership; retention period; Token Gateway implementation (AWS API Gateway or Fastify); event bus; chat and paging tools; screening provider; risk scoring approach (rules first, models later).

## 12. Token Gateway

Responsibilities: one route table that maps public paths to upstream services; OIDC token validation (signature, issuer, audience and expiry); scope checks per route; rate limits per user, per device and per client application (token bucket in Redis); the version gate, which reads `X-Client-Platform` and `X-Client-Version`; request ID creation and propagation; CORS for configured web origins; removal of internal error details from responses.

Not responsibilities: business logic, data storage, compliance decisions, and any handling of keys or secrets beyond token validation.

Route table: the table is kept as data in `packages/shared/routes.ts`. Each entry holds the path prefix, the upstream service, the required scopes, the rate limit class and whether mobile clients may call it. Section 14 of `API_AND_DATA.md` is the human-readable copy, and a contract test fails if the two differ.

Mobile specifics: access tokens are short-lived and refresh tokens are stored in the platform's secure storage [VERIFY with the mobile team]; the app never holds blockchain signing keys, and ownership signatures are made in the user's wallet app [VERIFY the wallet connection method]; push tokens are registered through the gateway and removed on logout; certificate pinning is a mobile build decision [VERIFY].

Deployment: WAF and an ALB in front of an ECS service. If the team chooses AWS API Gateway instead, it uses the same route table, and the token validation moves to a Lambda or ECS authoriser. Either way, the domain services stay on private subnets.

## 13. Compliance and Risk Engine

Shape: a module inside `apps/api`. Rule sets are versioned JSON data, loaded and evaluated in process. External data is read through the screening and KYC adapters. Decisions are written to `compliance_decisions` and review cases to `compliance_cases`.

Interface: `evaluate(checkType, subject, context)` returns a decision with `outcome` (allow, review or block), `score` (0 to 100), `reasons` (each with a stable code and a display message), `ruleSetVersion` and `evaluatedAt`.

Check types: `configuration.save`, `wallet.register`, `quote.execute`, `deployment.start`, `transaction.submit`.

Risk factors in v1 are rules only: amount above a threshold relative to history, new counterparty, velocity over a window, chain risk tier, congestion, and provider incident flag. Weights and thresholds sit in a configurable table, not in code. Model-based scoring is out of scope for v1 [VERIFY whether compliance wants it later].

Fail-closed policy: when a mandatory source (screening or KYC status) is unavailable, value movement receives review, and new wallet registration receives block [VERIFY with compliance].

Overrides: none for block. A review release requires a compliance role and a written reason. Releases above a configured amount need a second approver [VERIFY].

Audit: every decision is recorded with an input hash and the rule set version. Raw customer data is not copied into the decision record.

## 14. Notification Service

Event sources: `chain_tx.submitted`, `chain_tx.confirmed`, `chain_tx.failed`, `compliance.decision_recorded` (for review and block decisions), `conversion.state_changed` (for failed states), `deployment.state_changed` (for failed states) and `notification.delivery_failed`.

Chain transaction watcher: a worker that tracks each submitted transaction through the chain adapter's `getTxStatus`. It counts confirmations against a depth set per chain [VERIFY per network] and publishes `chain_tx.confirmed` or `chain_tx.failed` once the state is final. Each state change is written to `blockchain_transactions` through the outbox, so an event is never published without its row.

Pipeline: event bus, then the notification consumer, then route matching (event type, minimum severity, chain, environment), then the dedupe check (key: event ID plus transaction hash), then template rendering (no sensitive fields), then channel adapters, then the delivery record, then the escalation timer.

Severity: `info` for initiated and succeeded; `high` for a block decision or a failed non-production transaction; `critical` for a failed transaction on a production chain, or three failures within 10 minutes.

Threading: all notifications for one transaction share a thread key (the transaction row ID), so chat messages group together.

Templates: plain text plus structured fields. Shortened hashes only. Times in UTC, with local conversion in the console.

Escalation: an unacknowledged critical notification moves to the next on-call tier after 15 minutes; an unacknowledged high notification moves to the support lead after 60 minutes [VERIFY both with support].

Local development: the mock channel writes to the console log and to a local mail catcher. Demo mode routes only to the sandbox channel.
