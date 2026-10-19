# API and Data Contracts: Opus Tokenization Accelerator Suite

Version 1.1 · 2026-10-17 · All endpoints are under `/v1`. JSON in and out. Errors use the problem format below. Money amounts are decimal strings with an explicit `currency` or `asset` and `decimals`.

## 1. Conventions

- Authentication: `Authorization: Bearer <token>` (OIDC access token). Every route except `GET /v1/health` requires it.
- Gateway: all clients call the Token Gateway (section 14). Clients send `X-Client-Platform` (web, ios or android) and `X-Client-Version`. A missing or below-minimum value returns 426 Upgrade Required.
- Roles: `architect`, `operations`, `compliance`, `admin`, `viewer`, `production_support`. Each endpoint lists allowed roles.
- Idempotency: state-changing endpoints require `Idempotency-Key` (UUID); pure POST operations that do not mutate domain state are exempt (`POST /v1/selector/configurations/{id}/validate`, `POST /v1/gas/estimate`, `POST /v1/compliance/evaluate`). The same key and same request body replay the original response for 24 hours. Reusing a key with a different body returns 422; a concurrent duplicate returns 409 with `Retry-After` while the first request is in progress. The API service owns this behavior and persistence.
- Pagination: `?limit=` (default 25, max 100) and `?cursor=`. Responses include `nextCursor`.
- Timestamps: ISO 8601 UTC, for example `2026-10-16T12:00:00Z`.
- Errors (RFC 9457 problem details):

```json
{
  "type": "https://api.opus-tac.example/problems/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "Provider does not support the selected chain.",
  "instance": "/v1/selector/configurations/cfg_01",
  "requestId": "req_7f3a",
  "errors": [{ "path": "provider", "code": "unsupported_chain" }]
}
```

Status codes: 400 malformed; 401 unauthenticated; 403 forbidden for role; 404 not found; 409 conflict (version or state); 410 expired quote; 422 validation; 429 rate limited; 502 adapter failure (retryable flag in body); 500 internal.

## 2. Catalogue (S1 support data)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/v1/catalogue/stablecoins` | all | Coins with `us_listed`, `catalogue_status`, issuer, decimals, `why` |
| GET | `/v1/catalogue/providers` | all | Providers with supported assets and chains. Query: `coins`, `chain`, `ledger` |
| GET | `/v1/catalogue/ledgers` | all | Public and permissioned ledgers with governance notes. Query: `provider` |
| PUT | `/v1/admin/catalogue/stablecoins/{code}` | admin | Update eligibility (writes audit row) |

Stablecoin object:

```json
{
  "code": "USDC",
  "name": "USD Coin",
  "issuer": "Circle",
  "us_listed": true,
  "catalogue_status": "eligible",
  "decimals": 6,
  "why": "Reference example from the TAC deck; eligibility to be confirmed by compliance [VERIFY]."
}
```

Seed catalogue for demo (from the prototype; compliance to confirm): USDC, PYUSD, RLUSD and USDP are `eligible`; USDT and FDUSD are `not_eligible` in this catalogue. Keep `not_eligible` coins visible with the reason, so users understand the decision.

## 3. Stablecoin Selector (S1)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/v1/selector/configurations` | architect | Create a draft configuration |
| GET | `/v1/selector/configurations/{id}` | architect, compliance, viewer | Read draft or latest |
| PATCH | `/v1/selector/configurations/{id}` | architect | Update coins, provider, ledger, chain, wallets |
| POST | `/v1/selector/configurations/{id}/validate` | architect | Run server validation; returns issues and estimated cost |
| POST | `/v1/selector/configurations/{id}/versions` | architect | Save a new blueprint version |
| GET | `/v1/selector/blueprints/{id}/versions/{n}` | architect, compliance, viewer | Canonical blueprint JSON |
| POST | `/v1/deployments` | architect, admin | Phase 4+: start a deployment run from a version |

Configuration object:

```json
{
  "id": "cfg_01",
  "status": "draft",
  "coins": ["USDC", "PYUSD"],
  "provider": "prov_custody_a",
  "ledger": { "type": "public", "chain": "base" },
  "wallets": ["wal_01", "wal_02"],
  "volumeMonthly": 250000,
  "createdBy": "usr_12",
  "updatedAt": "2026-10-16T12:00:00Z"
}
```

Blueprint (versioned, canonical):

```json
{
  "schema": "opus.blueprint.v1",
  "configId": "cfg_01",
  "version": 3,
  "stablecoins": [{ "code": "USDC", "issuer": "Circle", "decimals": 6 }],
  "infrastructure": { "provider": "prov_custody_a", "signing": "mpc" },
  "ledger": { "type": "public", "chain": "base", "rationale": "Broad liquidity; public verifiability" },
  "wallets": [{ "id": "wal_01", "type": "mpc", "chain": "base", "limits": { "perTx": "100000.00", "daily": "500000.00" } }],
  "estimates": { "networkFeeMonthly": "42.10 USD", "infraFeeMonthly": "1250.00 USD", "basis": "estimate" },
  "checksum": "sha256:..."
}
```

Validation response:

```json
{
  "valid": false,
  "issues": [
    { "path": "provider", "code": "unsupported_chain", "message": "Provider does not support Solana." }
  ],
  "estimates": null
}
```

## 4. Wallet Adapter (S2)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/v1/wallets` | operations, compliance, architect, viewer | List wallets. Query: `chain`, `type`, `status` |
| POST | `/v1/wallets` | operations, architect | Register a wallet (address validated for chain) |
| POST | `/v1/wallets/{id}/verify/challenge` | operations | Issue an ownership challenge |
| POST | `/v1/wallets/{id}/verify` | operations | Submit signed challenge response |
| POST | `/v1/wallets/{id}/test-connection` | operations, architect | Call adapter; return result and timestamp |
| PATCH | `/v1/wallets/{id}/limits` | operations (within bounds), compliance | Set per-transaction and daily limits |
| DELETE | `/v1/wallets/{id}` | operations, admin | Soft delete (sets `removedAt`) |
| GET | `/v1/wallets/matrix` | all read roles | Wallet by chain matrix |

Wallet object:

```json
{
  "id": "wal_01",
  "label": "Treasury MPC Base",
  "type": "mpc",
  "provider": "prov_custody_a",
  "chain": "base",
  "address": "0x...",
  "verification": "verified",
  "screening": "not_screened",
  "limits": { "perTx": "100000.00", "daily": "500000.00", "currency": "USDC" },
  "lastTestedAt": "2026-10-16T11:58:00Z",
  "removedAt": null
}
```

Validation rules: address format per chain (for example EVM 0x and 40 hex characters with checksum where applicable; Solana base58 length; XRPL r-address). Reject duplicate address on the same chain within the same tenant.

## 5. Fiat Conversion Bridge (S3)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/v1/fx/quotes` | operations | Create a quote (returns expiry) |
| POST | `/v1/fx/quotes/{id}/execute` | operations | Execute if not expired |
| GET | `/v1/fx/conversions/{id}` | operations, compliance, viewer | Conversion and state history |
| GET | `/v1/fx/conversions` | operations, compliance, viewer | List with filters |
| GET | `/v1/fx/rates/history` | all read roles | 30-day history. Query: `pair` |

Quote request and response:

```json
// request
{ "direction": "fiat_to_stable", "amount": "10000.00", "fiat": "USD", "stable": "USDC", "walletId": "wal_01" }

// response
{
  "id": "qte_9a1",
  "rate": "1.0000",
  "spread": "0.0005",
  "fee": "5.00",
  "netAmount": "9990.00",
  "stableAmount": "9990.000000",
  "expiresAt": "2026-10-16T12:01:00Z",
  "source": "sandbox_fx",
  "basis": "simulated"
}
```

Conversion states: `quoted`, `accepted`, `funded`, `settling`, `settled`, `failed`, `expired`. Transitions are recorded in `conversion_events`. An attempt to execute an expired quote returns 410 and records an exception in the audit log.

Rounding rule: [VERIFY] placeholder `round_half_even` at the minor unit of the target currency or stablecoin decimals. The rule is a single function in `packages/shared/money.ts` with tests.

## 6. Gas Fee Calculator (S4)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/v1/gas/estimate` | all read roles | Estimate for given inputs |
| GET | `/v1/gas/chains` | all read roles | Chains with fee model metadata and price source |

Request and response:

```json
// request
{
  "chain": "base",
  "txType": "transfer",
  "monthlyVolume": 250000,
  "congestion": 1.5,
  "marginPct": 2.0,
  "view": "administrator"
}

// response
{
  "perTx": { "network": "0.0021", "infrastructure": "0.0050", "total": "0.0071", "currency": "USD" },
  "monthly": { "total": "1775.00", "currency": "USD" },
  "view": "administrator",
  "basis": "estimate",
  "priceSource": "static_model",
  "priceAt": null
}
```

Money fields are strings. The end-user view adds `marginPct` to the total and shows the margin separately. The engine returns the same numbers for the same inputs (tested).

## 7. Audit and Reporting (S5)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/v1/audit/events` | compliance, admin | Filter by `from`, `to`, `status`, `chain`, `type`, `actor` |
| GET | `/v1/audit/kpis` | compliance, admin, viewer | KPIs for a period |
| GET | `/v1/audit/exceptions` | compliance | Open and closed exceptions |
| POST | `/v1/audit/exports` | compliance | Start CSV or PDF export (job if over 100,000 rows) |
| GET | `/v1/audit/exports/{id}` | compliance | Status and download URL (pre-signed, 15 minutes) |

Audit event:

```json
{
  "id": "aud_000451",
  "occurredAt": "2026-10-16T12:00:03Z",
  "actor": { "id": "usr_12", "role": "operations" },
  "action": "fx.quote.execute.rejected_expired",
  "entity": { "type": "quote", "id": "qte_9a1" },
  "before": null,
  "after": { "status": "expired" },
  "sourceIpPrefix": "203.0.113.0/24",
  "requestId": "req_7f3a"
}
```

Audit rows are append-only. There are no update or delete endpoints.

## 8. Deployments (Phase 4 and later)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/v1/deployments` | architect, admin | Start a run for a blueprint version (sandbox only in Phase 4) |
| GET | `/v1/deployments/{id}` | architect, compliance, admin | Status, steps, plan summary |
| POST | `/v1/deployments/{id}/approve` | admin (second approver for production) | Approve the plan |
| POST | `/v1/deployments/{id}/cancel` | architect, admin | Cancel before apply |

Run states: `queued`, `rendering`, `planned`, `awaiting_approval`, `applying`, `verifying`, `succeeded`, `failed`, `cancelled`. Each step is recorded with start and end times, and failed steps can be retried by the job runner.

## 9. Relational data model (PostgreSQL)

Tables, primary keys in bold in the description:

- `tenants`: **id**, name, environment, created_at.
- `users`: **id**, tenant_id, external_subject, role, status.
- `stablecoins`: **code**, name, issuer, us_listed, catalogue_status, decimals, why, updated_at.
- `providers`: **id**, name, supported_assets (array), supported_chains (array), fee_bps, sla_text, status.
- `ledgers`: **id**, type (`public` or `permissioned`), chain, governance_note, status.
- `configurations`: **id**, tenant_id, status, coins (array), provider_id, ledger_id, chain, volume_monthly, created_by, updated_at.
- `blueprint_versions`: **id**, configuration_id, version, canonical_json (jsonb), checksum, created_by, created_at. Unique (configuration_id, version).
- `wallets`: **id**, tenant_id, label, type, provider_id, chain, address, verification, screening, limit_per_tx, limit_daily, last_tested_at, removed_at.
- `quotes`: **id**, tenant_id, direction, fiat, stable, amount, rate, spread, fee, net_amount, stable_amount, expires_at, created_by.
- `conversions`: **id**, quote_id, wallet_id, state, updated_at.
- `conversion_events`: **id**, conversion_id, from_state, to_state, occurred_at, detail.
- `gas_price_snapshots`: **id**, chain, value, source, observed_at.
- `audit_events`: **id**, tenant_id, occurred_at, actor_id, actor_role, action, entity_type, entity_id, before (jsonb), after (jsonb), source_ip_prefix, request_id. Append-only.
- `exceptions`: **id**, tenant_id, audit_event_id, category, status, opened_at, closed_at.
- `export_jobs`: **id**, tenant_id, kind (`csv` or `pdf`), filter (jsonb), status, file_key, requested_by, requested_at.
- `deployment_runs`: **id**, tenant_id, blueprint_version_id, state, plan_summary, requested_by, approved_by, created_at.
- `deployment_steps`: **id**, run_id, name, state, started_at, ended_at, detail.
- `idempotency_keys`: **id**, tenant_id, actor_id, key_hash, route, request_hash, state (`in_progress` or `completed`), response_status, response_body, created_at, expires_at. Unique (tenant_id, actor_id, route, key_hash). Never log raw keys or stored response bodies.

- `compliance_rules`: **id**, rule_set_id, version, definition (jsonb), status, created_by, created_at. Versioned; a published version is never edited in place.
- `compliance_decisions`: **id**, tenant_id, check_type, subject_type, subject_id, outcome, score, reasons (jsonb), rule_set_version, input_hash, evaluated_at.
- `compliance_cases`: **id**, decision_id, status (open, released, rejected), released_by, reason, updated_at.
- `blockchain_transactions`: **id**, tenant_id, chain, tx_hash, subject_type, subject_id, status (submitted, confirmed, failed), amount, asset, submitted_at, confirmed_at, failed_reason, explorer_url.
- `notification_routes`: **id**, tenant_id, event_type, min_severity, chain (nullable), channel_ids (array), escalation_policy_id.
- `notification_channels`: **id**, tenant_id, type (email, chat, paging, push), target_ref (a secret reference, never the raw target), status.
- `notifications`: **id**, tenant_id, event_id, dedupe_key, thread_key, severity, channel_id, status (queued, sent, failed, acknowledged, escalated), attempts, sent_at, acknowledged_by, acknowledged_at.
- `devices`: **id**, user_id, platform, push_token_ref, app_version, last_seen_at, revoked_at.
- `gateway_clients`: **id**, name, platform, status, min_version, scopes.
- `chainsync_sources`: **id**, tenant_id, source_type, secret_ref, status, schema_version, created_at. Store only secret references; source credentials are managed outside the application database.
- `chainsync_events`: **id**, tenant_id, source_id, source_event_id, event_type, schema_version, payload_hash, occurred_at, received_at, status. Unique (tenant_id, source_id, source_event_id); minimize or redact retained payload data.
- `corporate_actions`: **id**, tenant_id, action_type, asset_id, record_date, payment_date, rule_version, state, source_event_id, created_by, created_at.
- `oracle_observations`: **id**, tenant_id, provider, feed, asset, value, observed_at, received_at, freshness_status, source_ref. Values use decimal strings/numeric storage and retain provenance.
- `chainsync_settlement_runs`: **id**, tenant_id, corporate_action_id, chain, template_id, template_version, simulation_id, status, approval_count, required_approvals, idempotency_ref, transaction_id, created_at.
- `chainsync_reconciliation_runs`: **id**, tenant_id, chain, as_of, status, started_at, completed_at, source_refs.
- `chainsync_reconciliation_breaks`: **id**, run_id, entity_ref, expected_position, observed_position, difference, status, proposed_repair, approved_by, created_at.
- `chainsync_contract_templates`: **id**, name, version, schema, audit_status, audit_evidence_ref, status, created_at. Do not call a template pre-audited without recorded evidence and scope.
- `chainsync_simulations`: **id**, settlement_run_id, input_hash, outcome, gas_estimate, template_version, simulated_at, details_ref.

Money columns are `numeric(38,18)` in the database and returned as strings. Indexes: audit_events on (tenant_id, occurred_at), (entity_type, entity_id); wallets on (tenant_id, chain); conversions on (state, updated_at).

## 10. Events (internal)

Domain events are published to a queue after the database commit (transactional outbox). Names: `configuration.saved`, `blueprint.versioned`, `wallet.registered`, `wallet.verified`, `quote.created`, `quote.expired`, `conversion.state_changed`, `export.completed`, `deployment.state_changed`, `chain_tx.submitted`, `chain_tx.confirmed`, `chain_tx.failed`, `compliance.decision_recorded`, `notification.delivery_failed`, `chainsync.event_ingested`, `chainsync.action_scheduled`, `chainsync.settlement_submitted`, `chainsync.reconciliation_break_found`. Consumers must be idempotent. ChainSync events include source/event IDs, schema/rule versions, correlation IDs and timestamps; event payloads must not contain credentials, private keys or unnecessary personal data.

## 11. Rate limits

Quote creation: 30 per minute per user. Wallet registration: 10 per minute per user. Deployment start: 5 per hour per tenant. Export creation: 10 per hour per user. Returned as 429 with `Retry-After`. These limits are enforced at the Token Gateway, per user, per device and per client application.

ChainSync write and execution quotas are not set yet. Define bounded per-tenant and per-client limits after expected event/action volume, actor roles, and adapter behavior are validated; do not enable public execution routes without these limits.

## 12. Compliance and risk engine (S6)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/v1/compliance/evaluate` | architect, operations, admin | Dry-run a check without writing |
| GET | `/v1/compliance/decisions/{id}` | compliance, architect, viewer | Decision with reasons, score and rule set version |
| GET | `/v1/compliance/cases` | compliance | Review queue. Query: `status`, `limit`, `cursor` |
| POST | `/v1/compliance/cases/{id}/release` | compliance | Release a review case. Body: `reason` (required, minimum 20 characters) |
| POST | `/v1/compliance/cases/{id}/reject` | compliance | Reject a review case. Body: `reason` (required) |
| GET | `/v1/compliance/rule-sets` | compliance, admin | Rule set versions |
| POST | `/v1/compliance/rule-sets` | compliance | Publish a new rule set version (second approver [VERIFY]) |
| PUT | `/v1/compliance/thresholds` | compliance | Update risk thresholds; applies to new decisions only |

Evaluate request:

```json
{
  "checkType": "quote.execute",
  "subject": { "type": "quote", "id": "qte_9a1" },
  "context": { "amount": "10000.00", "asset": "USDC", "walletId": "wal_01", "chain": "base" }
}
```

Response:

```json
{
  "outcome": "review",
  "score": 72,
  "reasons": [{ "code": "AMOUNT_ABOVE_TYPICAL", "message": "Amount is above the 90-day median for this wallet." }],
  "ruleSetVersion": "rs-2026.10.1",
  "evaluatedAt": "2026-10-16T12:00:00Z"
}
```

Reason codes are stable identifiers; messages can change. An override request against a block decision returns 403 with code `block_not_overridable`.

## 13. Notifications (S7)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/v1/notifications` | operations, architect, compliance, production_support, admin | Notifications in the caller's scope. Query: `severity`, `status`, `chain` |
| POST | `/v1/notifications/{id}/acknowledge` | production_support, admin | Acknowledge; stops escalation |
| GET | `/v1/notifications/transactions/{txId}` | production_support, compliance, admin | Transaction timeline with linked notifications |
| GET | `/v1/notifications/routes` | admin, production_support | List routes |
| PUT | `/v1/notifications/routes/{id}` | admin | Update event types, minimum severity, chains, channels and escalation policy |
| POST | `/v1/notifications/channels` | admin | Add a channel; the target is stored as a secret reference |
| POST | `/v1/notifications/channels/{id}/test` | admin, production_support | Send a labelled test message |
| POST | `/v1/notifications/devices` | any authenticated user | Register a push token for the calling device |
| DELETE | `/v1/notifications/devices/{id}` | any authenticated user | Revoke a device's push token |

Notification object:

```json
{
  "id": "ntf_4411",
  "eventId": "evt_chain_9981",
  "type": "chain_tx.failed",
  "severity": "critical",
  "title": "Transaction failed on Base",
  "body": "USDC 10,000.00 · tx 0x3fa9c2d1...e87b40 · status failed · reason: insufficient gas",
  "chain": "base",
  "txHash": "0x3fa9c2d1...e87b40",
  "consoleLink": "https://console.example/tx/bt_552",
  "threadKey": "bt_552",
  "createdAt": "2026-10-16T12:03:10Z"
}
```

## 14. Token Gateway

The gateway forwards each public path to its upstream service after checking the token, scopes, client version and rate limits. The route table is kept in `packages/shared/routes.ts`, and this section is its human-readable copy. The implementation route metadata is method/path-specific and includes a rate-limit class and idempotency policy; quotas are defined in section 11 and are enforced per user, device and client application. The gateway forwards `Idempotency-Key`; the API service owns idempotency persistence and replay behavior. Token Gateway implementation and deployment details are in `TOKEN_GATEWAY.md`.

| Path prefix | Upstream | Scopes | Mobile allowed |
|---|---|---|---|
| `/v1/gateway` | gateway itself | none (public) | yes (health and version only) |
| `/v1/catalogue` | api | catalogue.read | yes |
| `/v1/selector` | api | selector.read, selector.write | no [VERIFY] |
| `/v1/wallets` | api (S2) | wallets.read, wallets.write | yes |
| `/v1/fx` | api (S3) | fx.read, fx.execute | yes |
| `/v1/gas` | api (S4) | gas.read | yes |
| `/v1/audit` | api (S5) | audit.read | no |
| `/v1/compliance` | api (S6) | compliance.read, compliance.decide | no |
| `/v1/notifications` | api (S7) | notifications.read, notifications.ack | yes |
| `/v1/deployments` | api | deploy.start, deploy.read | no |
| `/v1/chainsync` | api (S9) | chainsync.read, chainsync.manage, chainsync.execute | no |

Gateway endpoints: `GET /v1/gateway/health` returns 200 when the gateway can reach its dependencies. `GET /v1/gateway/version` returns the minimum supported version per platform.

Version rejection:

```json
{
  "type": "https://api.opus-tac.example/problems/upgrade-required",
  "title": "Upgrade required",
  "status": 426,
  "detail": "Client version 1.2.0 on ios is below the minimum 1.4.0.",
  "requestId": "req_7f3a"
}
```

## 15. ChainSync Integration Layer (S9 extension)

The public API below exposes authorized ChainSync workflows to the suite UI. Partner message intake (ISO 20022, SWIFT, FIX, custodian APIs and webhooks) uses private authenticated adapters; do not expose partner credentials or accept unsigned partner payloads through the public client routes.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/v1/chainsync/networks` | architect, operations, compliance, viewer | Tenant-enabled network/ledger adapters and capabilities |
| GET | `/v1/chainsync/contract-templates` | architect, operations, compliance, viewer | Versioned contract templates and audit/review status |
| GET | `/v1/chainsync/actions` | architect, operations, compliance, viewer | Corporate actions and settlement runs, filterable by status, type and chain |
| POST | `/v1/chainsync/actions` | architect, operations | Create a corporate action from validated off-chain inputs |
| GET | `/v1/chainsync/actions/{id}` | architect, operations, compliance, viewer | Action state, source references, calculation and audit summary |
| POST | `/v1/chainsync/actions/{id}/simulate` | architect, operations | Simulate entitlements and contract execution; no transaction is submitted |
| POST | `/v1/chainsync/actions/{id}/approve` | operations, admin | Record an approval through the configured custody/multisig workflow |
| POST | `/v1/chainsync/actions/{id}/execute` | operations, admin | Submit an approved and simulated settlement run |
| GET | `/v1/chainsync/reconciliations` | architect, operations, compliance, viewer | Reconciliation runs and open breaks |
| GET | `/v1/chainsync/reconciliations/{id}` | architect, operations, compliance, viewer | Position comparison, break evidence and proposed repair actions |
| POST | `/v1/chainsync/reconciliations/{id}/repairs/{breakId}/approve` | operations, admin | Approve a proposed repair; execution uses the regular policy and authorization path |

All state-changing requests require `Idempotency-Key`. Approval and execution are separate actions. A simulation is stored as a record for audit and therefore also requires an idempotency key. Responses include `requestId`, action/run state, rule/template versions and source timestamps. Error responses use the problem format in section 1.

Example action summary:

```json
{
  "id": "csa_01",
  "type": "coupon_payment",
  "assetId": "asset_01",
  "recordDate": "2026-10-01",
  "paymentDate": "2026-10-31",
  "rateSource": { "provider": "oracle_demo", "observedAt": "2026-10-16T12:00:00Z", "freshness": "fresh" },
  "template": { "id": "coupon-fixed", "version": 2, "auditStatus": "review_required" },
  "status": "draft",
  "simulationId": null,
  "approvalCount": 0,
  "requiredApprovals": 2,
  "chain": "canton"
}
```

Template audit status is explicit; do not describe a template as pre-audited unless the audit evidence and its scope are recorded. Candidate network names (Ethereum, Solana, Avalanche, Hyperledger Fabric, R3 Corda, Kinexys, GS DAP and Canton), oracle providers, tax forms, AML rules and Travel Rule behavior require deployment-specific validation. The API must report only network integrations enabled for the tenant. KYC documents and private keys are never stored by S9.
