# API and Data Contracts: Opus Tokenization Accelerator Suite

Version 1.0 · 2026-10-16 · All endpoints are under `/v1`. JSON in and out. Errors use the problem format below. Money amounts are decimal strings with an explicit `currency` or `asset` and `decimals`.

## 1. Conventions

- Authentication: `Authorization: Bearer <token>` (OIDC access token). Every route except `GET /v1/health` requires it.
- Roles: `architect`, `operations`, `compliance`, `admin`, `viewer`. Each endpoint lists allowed roles.
- Idempotency: write endpoints accept `Idempotency-Key` (UUID). Repeat requests with the same key return the original response for 24 hours.
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
- `idempotency_keys`: **key**, tenant_id, route, response_hash, response_body, created_at, expires_at.

Money columns are `numeric(38,18)` in the database and returned as strings. Indexes: audit_events on (tenant_id, occurred_at), (entity_type, entity_id); wallets on (tenant_id, chain); conversions on (state, updated_at).

## 10. Events (internal)

Domain events are published to a queue after the database commit (transactional outbox). Names: `configuration.saved`, `blueprint.versioned`, `wallet.registered`, `wallet.verified`, `quote.created`, `quote.expired`, `conversion.state_changed`, `export.completed`, `deployment.state_changed`. Consumers must be idempotent.

## 11. Rate limits

Quote creation: 30 per minute per user. Wallet registration: 10 per minute per user. Deployment start: 5 per hour per tenant. Export creation: 10 per hour per user. Returned as 429 with `Retry-After`.
