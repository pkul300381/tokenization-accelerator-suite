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
- AWS (sandbox first, production later) for hosting and for deployment automation.

## 2. Logical architecture

```
           +-----------------------------+
Browser -->| Web app (React, static)     |  CloudFront + S3
           +-------------+---------------+
                         | HTTPS (JSON)
           +-------------v---------------+
           | API gateway / ALB + WAF     |
           +-------------+---------------+
                         |
     +-------------------v-------------------+
     | API service (Fastify)                 |  ECS Fargate
     |  - auth & RBAC                        |
     |  - S1 selector  - S2 wallets          |
     |  - S3 fx bridge - S4 gas engine       |
     |  - S5 audit & reports                 |
     +----+--------------+-----------+-------+
          |              |           |
   +------v-----+  +-----v----+  +---v-----------------+
   | PostgreSQL |  |  Redis   |  | Job workers (BullMQ) |  ECS Fargate
   | (RDS)      |  |          |  | - report export      |
   +------------+  +----------+  | - deployment runs    |
                                 | - quote expiry       |
                                 +---+------------------+
                                     |
                 +-------------------v--------------------+
                 | Adapter layer                          |
                 |  custody · chain · fx · gas · kyc ·    |
                 |  screening · aws-deploy                |
                 |  (each has a real and a mock impl)     |
                 +----------------------------------------+
```

The web app is a static single-page application served from object storage behind a CDN. The API is a stateless service behind a load balancer. Background workers run the same code base with a different entry point. Adapters are the only place where external systems are called.

## 3. Components

| Component | Responsibility | Notes |
|---|---|---|
| `apps/web` | Suite shell and five service pages | Calls only the public API. No secrets in the bundle. |
| `apps/api` | Business logic, validation, authorisation, audit | One module per service: `selector`, `wallets`, `fx`, `gas`, `audit`, plus `catalogue` and `deployments`. |
| `workers` | Background jobs | Idempotent. Jobs carry an idempotency key. |
| `packages/shared` | Schemas, types, catalogue seed, constants | Single source of truth for contracts. |
| `packages/adapters` | Adapter interfaces and implementations | Real adapters are feature-flagged per environment. |
| `infra/terraform` | AWS environments | Dev, staging, prod in separate accounts. |

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

Network: public subnets only for the load balancer; application and data in private subnets; security groups allow only required ports; WAF rules for common attacks and rate limits; no public database endpoint.

Data protection: TLS everywhere; KMS customer-managed keys for RDS, S3, Secrets Manager and CloudWatch logs; backups encrypted; key rotation enabled.

Secrets: Secrets Manager for vendor credentials, rotated on a schedule; the application reads them at startup and on rotation, never from environment files in images.

Key material: the application never holds custody keys. Signing is done by the custody provider, or by an HSM or KMS key under the provider's control [VERIFY].

Audit: append-only table, separate database role with insert and select only for the audit schema; logs shipped to a separate account.

Supply chain: lockfile committed; dependency and container scanning in CI; images built from minimal base images; signed images where the platform supports it.

Threat model: maintain a threat model in `docs/THREAT_MODEL.md` covering spoofed quotes, replayed signatures, tampered blueprints, privilege escalation through the catalogue admin role, and export abuse. Review it at each phase exit.

## 9. Observability and operations

Structured JSON logs with request ID, user role (not identity where possible), route and latency. Metrics: request rate, error rate, p95 latency per route, queue depth, job failure rate, adapter error rate by vendor. Alerts on error rate above 2% for 5 minutes, queue depth above a threshold, and any audit write failure. Runbooks in `docs/runbooks/`.

## 10. Environments and release

Dev: local containers with mock adapters; demo seed on. Staging: sandbox adapters where available, demo seed on, production-like infrastructure. Production: live adapters only when enabled by sign-off, demo seed off.

Release: trunk-based development with short-lived branches; CI on every pull request; deploy to dev on merge; staging on tag; production on approved tag.

## 11. Decisions to record

Record each of these in `docs/DECISIONS.md` when made: frontend framework; API framework; ORM; hosting (ECS or EKS); custody provider shortlist; first public chain and first permissioned ledger; PDF generation library; catalogue ownership; retention period.
