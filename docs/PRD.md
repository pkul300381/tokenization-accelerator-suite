# Product Requirements: Opus Tokenization Accelerator Suite

Version 1.1 · 2026-10-17 · Owner: TAC service line · Status: Draft for review

## 1. Purpose

Opus teams and client teams need a single place to choose and configure the building blocks of a tokenized payments or stablecoin programme, understand the cost of operating it, convert money in and out, and prove what happened for audit. Today these decisions are spread across decks, spreadsheets and vendor portals. The suite brings them into one application that produces a configuration which can later be deployed.

## 2. Users and roles

| Role | Who | Main needs |
|---|---|---|
| Solution architect | Opus TAC architects | Configure stablecoin, provider, ledger and wallets; export the blueprint |
| Programme manager | Client or Opus PM | Review costs, track conversions, see status |
| Operations analyst | Client operations | Register and verify wallets; run conversions; watch settlement |
| Compliance officer | Client or Opus compliance | Audit trail, reports, eligibility decisions |
| Administrator | Platform team | Catalogue maintenance, fee schedules, user roles, environment settings |
| Production support engineer | Opus and client production support | Receive alerts for blockchain transaction events and failures; acknowledge and escalate them |
| Viewer | Read-only stakeholders | Dashboards and reports only |

Authorisation matrix: architects can create and edit blueprints; operations can register wallets and create conversions; compliance can read everything and export reports; administrators can edit catalogue and fee data; viewers can read only. Production support engineers receive notifications and can acknowledge them and manage their own channels; they cannot change configurations or release compliance cases.

## 3. Scope

The suite now contains nine service offerings. The original eight (S1 to S8) remain the v1 baseline. ChainSync Integration Layer (S9) is an approved suite extension with staged delivery; its component model is defined here, while each production integration requires adapter, security, legal and network validation before release.

In scope for the v1 baseline: the suite shell and navigation; S1 to S8; a demo mode with seeded data; authentication and roles; audit logging; reporting; a deployable blueprint JSON export; sandbox adapters for custody, chain, FX and gas. S9 is not assumed to be production-ready as part of the v1 baseline.

Out of scope for v1: live fund movement; native mobile app builds (the gateway and notification contracts that mobile apps use are in scope); production custody integration; KYC document storage; trading; retail user onboarding; automatic AWS deployment to production (sandbox only until Phase 5 sign-off).

## 4. Suite shell

The landing page shows the suite title "Opus Tokenization Accelerator Suite", the six business services (S1 to S5 plus the staged S9 ChainSync extension) as selectable cards, and the three platform services (Compliance & Risk Engine, Notification Service, Token Gateway) in a separate row labelled Platform. Each card shows its purpose in one sentence, its delivery status (Live, Beta, Planned, or Extension planned) and a primary action. The header has navigation to each service, a theme toggle (system, light, dark), and a visible "Simulated data" label whenever seeded data is shown. The footer shows the build version and environment name.

## 5. Services and acceptance criteria

### S1. Stablecoin Selector

Purpose: produce a validated tokenization configuration.

User flow: (1) choose one or more eligible US-listed stablecoins; (2) choose an infrastructure provider that supports the chosen coins; (3) choose a ledger type (public or permissioned) and a specific chain that the provider supports; (4) add wallets for the coins; (5) review the summary and export the blueprint.

Acceptance criteria:
- AC-S1-1: Only stablecoins with eligibility flag `us_listed = true` and `catalogue_status = eligible` can be selected.
- AC-S1-2: The provider list is filtered to providers that support every selected coin and the selected chain. Providers that do not are shown disabled with the reason.
- AC-S1-3: A public chain and a permissioned ledger are both selectable. For a permissioned ledger the user sees the governance model (consortium members, membership control) before selection.
- AC-S1-4: The review step shows estimated monthly infrastructure cost using the Gas Fee Calculator engine for the selected configuration volume.
- AC-S1-5: The blueprint JSON validates against the schema in `API_AND_DATA.md` and is byte-identical for the same inputs.
- AC-S1-6: Saving a blueprint creates a version number. Earlier versions remain readable.
- AC-S1-7: The server rejects any configuration that breaks AC-S1-1 or AC-S1-2, even if the browser allowed it.
- AC-S1-8: A "Deploy to sandbox AWS" action is shown as Planned until Phase 4, and is disabled with an explanation.

### S2. Wallet Adapter

Purpose: register and manage wallets used by a configuration.

Acceptance criteria:
- AC-S2-1: Wallet types supported in v1: custodial, MPC, smart-contract. Each has a provider, a chain and a signing model shown in the list.
- AC-S2-2: Address format is validated for the target chain before the wallet is saved.
- AC-S2-3: Ownership verification issues a challenge and checks a signed response. The application never receives a private key.
- AC-S2-4: Each wallet shows a limit (per transaction and daily) that is enforced by the server on conversions.
- AC-S2-5: Wallet removal is a soft delete. Removed wallets cannot be used in new conversions; history is kept.
- AC-S2-6: A test-connection action calls the adapter and shows the result with a timestamp.
- AC-S2-7: A wallet-by-chain matrix shows which wallets are active on which chains.
- AC-S2-8: Sanctions screening status of each address is shown as "Not screened" until the screening adapter is configured [VERIFY].

### S3. Fiat Conversion Bridge

Purpose: quote and track conversion between fiat and stablecoins.

Acceptance criteria:
- AC-S3-1: The user chooses direction (fiat to stablecoin, or stablecoin to fiat), an amount, a currency and a stablecoin.
- AC-S3-2: A quote shows rate, spread, fee, net amount and an expiry time (default 60 seconds in demo, configurable in production).
- AC-S3-3: The server rejects execution of an expired quote. The UI shows a countdown and refreshes the quote on request.
- AC-S3-4: Settlement shows its state (quoted, accepted, funded, settling, settled, failed, expired) and the time of each transition.
- AC-S3-5: A 30-day rate history chart is shown for each pair. In demo mode it is labelled simulated.
- AC-S3-6: Rounding follows one documented rule, applied on the server, and the UI shows the rounded value only.
- AC-S3-7: Every transition is in the audit log.

### S4. Gas Fee Calculator

Purpose: estimate operating cost per transaction and per month.

Acceptance criteria:
- AC-S4-1: Inputs: chain, transaction type (transfer, mint, burn, redeem), monthly volume, congestion multiplier (1x to 5x), margin percentage.
- AC-S4-2: Output shows network fee per transaction, infrastructure fee per transaction, total per transaction, and monthly total.
- AC-S4-3: Two views: end-user (fee passed to the customer, including margin) and administrator (cost breakdown without margin).
- AC-S4-4: The bar chart uses a logarithmic scale when the range exceeds two orders of magnitude, and says so on the axis.
- AC-S4-5: The same engine is used by the Stablecoin Selector review step. A unit test verifies identical output for identical inputs.
- AC-S4-6: When a live gas-price adapter is configured, the page shows the source and timestamp of the price. When it is not, the page says the figures are estimates.

### S5. Audit and Reporting

Purpose: record and report every operation.

Acceptance criteria:
- AC-S5-1: Every write across all services produces an audit row with actor, action, entity, timestamp (UTC), source IP masked to /24, before and after values where applicable, and a request ID.
- AC-S5-2: The audit view filters by period (7, 30, 90 days, custom), status, chain and transaction type, with pagination of 25 rows.
- AC-S5-3: KPIs show transaction count, success rate, total volume by currency, and open exceptions.
- AC-S5-4: Compliance findings list exceptions (for example, a transaction that exceeded a wallet limit, a quote executed after expiry attempt, a failed screening).
- AC-S5-5: CSV export of the current filter, with the filter and generator recorded in the audit log. Export size limit 100,000 rows; larger exports run as background jobs.
- AC-S5-6: PDF report with the cover page, filter, KPIs, exception list and generation metadata. Available in v1.1.
- AC-S5-7: Audit rows are append-only. No API endpoint updates or deletes them.

### S6. Compliance and Risk Engine

Purpose: validate each operation against compliance requirements and score the risk of each transaction. Every value-moving or configuration-changing operation in S1 to S3 and in deployment calls the engine before it commits.

Checks in v1: stablecoin eligibility and provider support; wallet screening status against sanctions lists through the screening adapter [VERIFY]; per-transaction and daily limits; KYC reference status from the KYC provider; jurisdiction and counterparty rules [VERIFY]; and rules-based risk factors (amount against the wallet's history, new counterparty, velocity over a time window, chain risk tier, network congestion, provider incident flag).

Acceptance criteria:
- AC-S6-1: every check returns allow, review or block, with at least one stable reason code and a display message.
- AC-S6-2: a block decision cannot be overridden by any role in the UI, and the API rejects any override request for a block with error code `block_not_overridable`.
- AC-S6-3: a review decision places the operation in the compliance case queue. A compliance role releases or rejects the case with a written reason (minimum 20 characters). Both actions are audited.
- AC-S6-4: rule sets are versioned. Each decision stores the rule set version and an input hash, so the decision can be reproduced.
- AC-S6-5: the risk score runs from 0 to 100. Thresholds are set by a compliance role, every change is audited, and a change applies only to decisions made after it.
- AC-S6-6: screening results are cached for no more than 24 hours [VERIFY], and the source list version is stored with each decision.
- AC-S6-7: the check returns within 200 ms at p95, excluding screening provider latency. If a mandatory data source is unavailable, value movement receives review and new wallet registration receives block [VERIFY with compliance].
- AC-S6-8: in demo mode, mock lists are used and every decision is labelled simulated.

### S7. Notification Service

Purpose: tell production support personnel what the blockchain is doing. When a transaction is initiated on a chain, a notification is raised. When that transaction later succeeds or fails, a second notification is raised.

Acceptance criteria:
- AC-S7-1: a `chain_tx.submitted` event produces an "initiated" notification within 60 seconds of the event.
- AC-S7-2: a `chain_tx.confirmed` event produces a "succeeded" notification and a `chain_tx.failed` event produces a "failed" notification. All notifications for one transaction share a thread key, so they appear together in the chat channel.
- AC-S7-3: failed transactions page the on-call engineer and post to the support chat channel. Initiated and succeeded notifications go to the chat channel and to the e-mail digest [VERIFY channel policy with support].
- AC-S7-4: every notification includes the chain, the shortened transaction hash (first 10 and last 6 characters), amount, asset, status, UTC timestamp, the related case or configuration ID, and a link to the internal console. It never includes full wallet addresses or customer identifiers.
- AC-S7-5: a duplicate event (same event ID) produces one notification. A retry of the same transaction does not produce a second page within 15 minutes.
- AC-S7-6: a critical notification not acknowledged within 15 minutes escalates to the next on-call tier. A high-severity notification not acknowledged within 60 minutes escalates to the support lead [VERIFY].
- AC-S7-7: a failed delivery is retried with backoff. After the retry limit, the failure is written to the audit log and shown on the operator dashboard.
- AC-S7-8: production support personnel manage channels and on-call routing in the console. Every change is audited and every routing test message is labelled as a test.
- AC-S7-9: mobile devices registered through the Token Gateway receive push alerts for failed transactions when the user has opted in.

### S8. Token Gateway

Purpose: one API gateway for web front ends and mobile apps to reach the back-end services, including the Wallet Adapter, the Notification Service and the other services.

Acceptance criteria:
- AC-S8-1: all client traffic enters through the gateway. A network test from outside the VPC confirms that no domain service port is reachable.
- AC-S8-2: the gateway validates the OIDC access token and checks the scopes for each route before forwarding the request.
- AC-S8-3: routes are defined in one route table that matches section 14 of `API_AND_DATA.md`. A contract test fails if the two differ.
- AC-S8-4: rate limits apply per user, per device and per client application. A limit returns 429 with a Retry-After header.
- AC-S8-5: every request carries X-Request-Id, X-Client-Platform (web, ios or android) and X-Client-Version. A client below the minimum supported version receives 426 Upgrade Required.
- AC-S8-6: the gateway adds no more than 50 ms at p95.
- AC-S8-7: mobile devices register and revoke push tokens through the gateway. Tokens are removed on logout.
- AC-S8-8: the gateway does not log request or response bodies. It logs the route, status, latency and request ID only.
- AC-S8-9: CORS allows only the configured web origins.

### S9. ChainSync Integration Layer (suite extension)

Purpose: connect traditional financial systems and off-chain corporate-action workflows to on-chain execution and reconciliation. S9 extends the existing five business services; it composes with the Wallet Adapter, Fiat Conversion Bridge, Gas Fee Calculator, Audit and Reporting, Compliance & Risk Engine, Notification Service, and Token Gateway rather than replacing them.

Target component set: ISO 20022 Event Listener; Coupon Payment Automator; Oracle Connector; Multi-Chain Router; Stablecoin Delivery Rail; Ledger Scan; Reconciliation Engine; Compliance & Reporting; Smart Contract Library. The architecture includes event ingestion (ISO 20022, SWIFT, FIX, custodian APIs and webhooks), corporate-action orchestration and exception management, reference-rate/FX/NAV oracle feeds, a control plane, smart-contract adapter, and routing to connected ledgers.

Acceptance criteria:
- AC-S9-1: Inbound messages from approved financial sources are authenticated, schema-validated, normalized to a versioned event format, deduplicated by source event ID, and stored with source and receipt timestamps. External callbacks use private, authenticated adapters; browser/mobile clients cannot submit partner events as trusted data.
- AC-S9-2: The orchestration engine supports versioned corporate-action rules and an explicit state machine. Invalid transitions are rejected, exceptions are visible, and every transition is auditable.
- AC-S9-3: Coupon automation supports scheduled fixed-rate and SOFR-linked floating-rate examples. Calculations retain the source inputs, rule version, rounding result, and eligible-holder snapshot used to derive entitlements.
- AC-S9-4: Oracle observations for approved reference-rate, FX and NAV feeds include provider, value, observed time, received time and freshness status. Stale, missing or out-of-range observations block or place an action into review according to configured policy; feed providers and Chainlink availability are [VERIFY].
- AC-S9-5: The multi-chain router exposes only adapters enabled for the tenant and environment. Ethereum, Solana, Avalanche, Hyperledger Fabric, R3 Corda, Kinexys, GS DAP and Canton are candidate targets from the offering design; support, interoperability and deployment availability are [VERIFY] per network and client.
- AC-S9-6: The smart-contract library versions each template and records its review/audit provenance. Templates cover coupon, redemption, voting, stock split, tender offer and waterfall distribution. Do not label a template "pre-audited" unless evidence and scope of the audit are recorded.
- AC-S9-7: A settlement run must pass simulation, policy checks and configured multi-signature/custody authorization before submission. Application code never receives private keys. Gas optimization is bounded; retries are allowed only when the chain adapter and idempotency policy make the submission safe.
- AC-S9-8: Ledger Scan captures ownership at the configured record date and calculates per-holder entitlements from a reproducible snapshot. Stablecoin delivery uses the existing FX and Wallet services and does not bypass their compliance, limits or approval checks.
- AC-S9-9: Reconciliation compares recorded off-chain positions and on-chain results, identifies breaks with explainable differences, and proposes repair actions. No repair may move funds or alter a ledger without the normal authorization and approval path.
- AC-S9-10: Compliance and reporting links to the existing KYC reference registry, AML screening and audit services. Travel Rule and 1099/FATCA outputs are jurisdiction-dependent capabilities and remain [VERIFY] with compliance/legal; S9 stores references and required reporting metadata, not KYC documents.
- AC-S9-11: Every ingested event, oracle observation, simulation, approval, settlement transition, reconciliation result and repair decision has a request/correlation ID and an append-only audit record. Logs exclude secrets, full wallet addresses and sensitive event payloads.

Delivery boundary: S9 starts in mock/demo mode. Network adapters, oracle sources, financial-message connectivity, legal reporting obligations, transaction authority and operating roles must be validated with the client before a sandbox or production integration is enabled.

## 6. Roles and permissions summary

Permissions are enforced on the server. Each endpoint in `API_AND_DATA.md` lists the roles allowed. The UI hides controls the user cannot use, but hiding is not the control: the server returns 403 for disallowed actions.

## 7. Non-functional requirements

- Performance: first contentful paint under 2 seconds on a mid-range laptop over broadband. API p95 latency under 300 ms for reads and under 800 ms for writes, excluding external vendor calls.
- Availability: 99.9% for the web and API tiers in production.
- Accessibility: WCAG 2.2 AA; full keyboard operation; screen reader labels on charts (with a text summary).
- Responsiveness: usable at 400 px width without horizontal scroll.
- Notifications: an initiated, succeeded or failed notification is sent within 60 seconds of the triggering event, measured end to end in staging.
- Gateway: adds no more than 50 ms at p95 to any route.
- Localisation: English (US) in v1; all strings in a resource file.
- Observability: structured logs, request IDs, traces, and dashboards for API latency, error rate and job queue depth.
- Data retention: audit rows retained for the period set by compliance [VERIFY]; default seven years in the sandbox configuration.

## 8. Demo mode

Demo mode is on in dev and staging. Notifications in demo mode go only to a sandbox channel and a test paging service, never to a production on-call rota. It uses seeded data from `packages/shared` seed files. Every page in demo mode shows a "Simulated data" badge. Demo mode is off in production by configuration, and the production build fails if demo seed data is imported into a production route.

## 9. Success measures

- An architect can produce a valid blueprint for a new programme in under 15 minutes without support.
- Zero paths where a non-eligible stablecoin or unsupported provider can be saved (checked by automated tests).
- Every write has an audit row (checked by a test that runs each write endpoint and counts rows).
- Every value-moving operation has a recorded compliance decision (checked by a test that runs each write endpoint).
- A failed transaction reaches an on-call engineer within 60 seconds in a monthly drill.
- Internal pilot: at least two Opus solution architects and one client operations team complete a walkthrough and rate the flow at 4 out of 5 or higher.

## 10. Open questions

Tracked in `docs/OPEN_QUESTIONS.md` once the repo exists. Initial items: confirm the catalogue of eligible stablecoins with compliance [VERIFY]; confirm the custody provider shortlist and their chain coverage [VERIFY]; confirm the permissioned ledger options Opus will support [VERIFY]; confirm the fee rounding rule [VERIFY]; confirm the audit retention period [VERIFY]. Platform items: choose the chat and paging tools for notifications [VERIFY]; confirm the sanctions screening provider and the fail-closed policy [VERIFY]; agree risk thresholds and the review queue owner with compliance. The Token Gateway implementation recommendation is Apache APISIX on ECS; record the decision and validate its deployment model before production.
