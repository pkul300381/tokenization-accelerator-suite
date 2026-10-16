# Build Plan: Opus Tokenization Accelerator Suite

Version 1.0 · 2026-10-16 · Each task has an ID, a goal, files to touch, tests to run and an exit check. Use `skill.md` for every task. Do not start a phase until the previous phase's exit gate is passed.

Indicative effort assumes one senior engineer plus one engineer, working with an AI assistant. Adjust to team size. Durations are estimates, not commitments.

## Phase 0: Foundations (week 1 to 2)

**Goal:** a repository that builds, tests and deploys an empty app to a dev environment.

- **F0-01 Repository scaffold.** Create the monorepo layout in `instructions.md` section 7. Set up pnpm workspaces, TypeScript strict, ESLint, Prettier, Vitest. Files: root config, `apps/web`, `apps/api`, `packages/shared`, `packages/adapters`. Test: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` all pass with one smoke test each. Exit check: CI pipeline runs on a pull request.
- **F0-02 Shared contracts.** Add Zod schemas for stablecoin, provider, ledger, configuration, blueprint, wallet, quote, conversion, gas estimate, audit event and problem response. Unit tests for valid and invalid samples. Exit check: schemas match `API_AND_DATA.md`.
- **F0-03 Money and time utilities.** Implement decimal-string arithmetic helpers, the rounding function (placeholder rule marked [VERIFY]), and UTC helpers. Tests with at least 30 cases, including boundary and negative values. Exit check: no float used for money anywhere (search and test).
- **F0-04 API skeleton.** Fastify app with `GET /v1/health`, problem-details error handler, request ID middleware, structured logging, and OIDC token validation behind a configuration flag (mock identity provider in dev). Tests: health, 401 without token, 401 with bad token, problem format. Exit check: Supertest suite green.
- **F0-05 Database and migrations.** PostgreSQL in Docker Compose; migrations for the tables in `API_AND_DATA.md` section 9; seed script for catalogue data; audit table with insert-and-select-only role. Tests: migration up and down on an empty database; seed idempotent. Exit check: `scripts/seed` runs twice with no error and the same row counts.
- **F0-06 Web shell.** Vite React app, router, layout with header, theme toggle (system, light, dark), footer with version and environment, a "Simulated data" badge component. Tests: render test for each route; axe accessibility check on the shell. Exit check: shell renders at 400 px with no horizontal scroll.
- **F0-07 Dev environment and infra baseline.** Terraform for dev: VPC, RDS, ECS cluster, ECR, S3 and CloudFront for the web app, Secrets Manager, KMS keys. No production resources. Exit check: `terraform plan` clean in dev; apply to dev succeeds.

**Gate 0:** CI green, dev environment reachable, shell shows the suite title and five disabled service cards.

## Phase 1: Suite shell and catalogue (week 3 to 4)

**Goal:** the landing page and the catalogue APIs, with eligibility rules enforced.

- **F1-01 Catalogue endpoints.** `GET` stablecoins, providers, ledgers with filters. Tests: filters, empty results, unknown query parameter rejected.
- **F1-02 Admin catalogue update.** `PUT /v1/admin/catalogue/stablecoins/{code}` with audit row. Tests: admin allowed, architect forbidden (403), audit row present.
- **F1-03 Landing page.** Suite title, five service cards (status Live, Beta or Planned per `PRD.md` section 4), keyboard navigation, reduced-motion support. Playwright test for card navigation.
- **F1-04 Authentication and RBAC middleware.** Role claims, endpoint-level role checks, UI route guards. Tests: each role against each endpoint in a matrix (generated from `API_AND_DATA.md`).

**Gate 1:** catalogue endpoints pass tests; role matrix test passes; landing page passes accessibility check.

## Phase 2: Core services in sandbox (week 5 to 10)

**Goal:** all five services work end to end against sandbox adapters.

### S1 Stablecoin Selector

- **S1-01 Configuration CRUD.** Create, read and patch configurations. Tests: validation on each field; 409 on version conflict.
- **S1-02 Validation engine.** Server rules for AC-S1-1 and AC-S1-2, returning issues with paths. Tests: one per rule plus combined cases.
- **S1-03 Blueprint versioning and canonical JSON.** Versions, checksum, deterministic serialisation. Tests: same input yields identical bytes; version increments; old versions readable.
- **S1-04 Five-step wizard UI.** Coins, provider, ledger (public and permissioned tabs with governance notes), wallets, review. Tests: Playwright golden path; error path where an unsupported provider is disabled with reason.
- **S1-05 Review and export.** Estimated cost via the gas engine (depends on S4-01); download blueprint JSON. Test: exported file validates against schema.
- **S1-06 Deployment placeholder.** Disabled "Deploy to sandbox AWS" with explanation (AC-S1-8). Test: button disabled and explanation visible.

### S2 Wallet Adapter

- **S2-01 Adapter interface and mocks.** Custody adapter interface and mock implementation with deterministic responses. Tests: contract tests that run against every implementation.
- **S2-02 Wallet registration.** Address validation per chain. Tests: valid and invalid addresses for EVM, Solana and XRPL samples.
- **S2-03 Ownership verification.** Challenge issue and signed-response check using the chain's signature scheme. Tests: valid signature accepted; wrong key, expired challenge and replayed challenge rejected. Note: the application never receives a private key; tests use a test key pair only.
- **S2-04 Limits and soft delete.** Tests: limit enforced on conversions (depends on S3-02); removed wallet unusable.
- **S2-05 Wallet UI and matrix.** List, add, verify, test connection, remove, matrix. Playwright tests for add and verify.

### S3 Fiat Conversion Bridge

- **S3-01 Rate provider and quote creation.** Sandbox FX adapter with deterministic rates; quote with expiry. Tests: rounding cases; expiry set correctly.
- **S3-02 Execute and state machine.** Execute only if not expired; transitions recorded. Tests: each legal transition; illegal transition rejected; expired quote returns 410 and writes an exception.
- **S3-03 Conversion UI.** Direction, amount, currency, stablecoin, quote panel with countdown, execute, state timeline. Playwright test for expiry handling with a mocked clock.
- **S3-04 Rate history chart.** Thirty-day series from the sandbox provider, labelled simulated. Test: chart has text summary and accessible table.

### S4 Gas Fee Calculator

- **S4-01 Gas engine.** Pure function: inputs to per-transaction and monthly values, with congestion and margin. Tests: at least 40 cases with explicit expected values; identical inputs give identical output.
- **S4-02 Gas API and chain metadata.** Estimate and chains endpoints. Tests: validation bounds (congestion 1 to 5, margin 0 to 20 percent).
- **S4-03 Gas UI.** Inputs, two views, bar chart with log scale rule (AC-S4-4), basis label. Playwright test for view switch.

### S5 Audit and Reporting

- **S5-01 Audit writer.** A single function every write path calls; tests check each state-changing route in S1 to S4 produces exactly one row (this is a cross-cutting test; see `PRD.md` section 9).
- **S5-02 Audit query and KPIs.** Filters, pagination, KPI aggregates. Tests: filter combinations; pagination boundary.
- **S5-03 Exceptions.** Rules that open exceptions (expired execution attempt, limit breach, failed screening). Tests per rule.
- **S5-04 CSV export.** Synchronous below 100,000 rows; job above. Tests: filter recorded; row count; the export itself is audited.
- **S5-05 Audit UI.** Filters, KPIs, exceptions list, paginated table, export button with status. Playwright test for filter and export.

**Gate 2:** all five services pass unit, API and end-to-end tests in sandbox; the cross-cutting audit test passes; accessibility checks pass on every page; a walkthrough of the golden path by an Opus architect is recorded.

## Phase 3: Hardening and pilot (week 11 to 14)

- **F3-01 Security review.** Threat model in `docs/THREAT_MODEL.md`; fix findings; dependency and container scanning clean of critical findings.
- **F3-02 Performance.** Load test at 2x expected peak; confirm latency targets in `PRD.md` section 7.
- **F3-03 Observability.** Dashboards, alerts and runbooks for the top five failure modes.
- **F3-04 Compliance review.** Compliance walks through the audit schema, exception rules, retention setting and stablecoin catalogue. Items resolved or recorded in `docs/OPEN_QUESTIONS.md`.
- **F3-05 Pilot.** Two architects and one client operations team use the suite in staging with demo data, then with a sandbox custody account. Feedback recorded in `docs/PILOT_FEEDBACK.md`.

**Gate 3:** no open critical or high security findings; pilot rating of 4 or higher (`PRD.md` section 9); compliance sign-off on catalogue and retention.

## Phase 4: Deployment automation to sandbox AWS (week 15 to 20)

- **D4-01 Blueprint to Terraform renderer.** Templates for the modules the blueprint needs (for example VPC, custody connector, ledger node, API). Tests: golden-file tests of rendered output for three sample blueprints.
- **D4-02 Deployment run state machine.** States from `API_AND_DATA.md` section 8; resumable steps; idempotency. Tests: simulated failure at each step and resume.
- **D4-03 Plan review and approval.** Plan summary stored; approval required; sandbox auto-approve allowed by configuration. Tests: approval missing blocks apply.
- **D4-04 Sandbox apply and verification.** Apply to the sandbox account using short-lived role credentials; post-deploy checks. Tests in an isolated sandbox account only.
- **D4-05 Deployment UI.** Start from a saved blueprint version, live step timeline, plan summary, cancel. Playwright test with the mock runner.
- **D4-06 Cleanup and teardown.** Destroy run for sandbox resources; cost guard alarm. Test: teardown leaves no resources in the sandbox account (checked by a tag query).

**Gate 4:** a blueprint deploys to the sandbox account end to end and tears down cleanly; every resource is tagged with the run ID; audit rows exist for each step.

## Phase 5: Production readiness (week 21 onwards)

- **P5-01 Production infrastructure.** Terraform for production in a separate account; KMS keys, backups, WAF rules, log archive account.
- **P5-02 Live adapter enablement.** Enable one custody provider and one public chain in production, behind a flag, after vendor due diligence [VERIFY]. Tests: adapter contract tests against the vendor's sandbox.
- **P5-03 Production deployment automation.** Two-approver rule, change ticket reference, production state machine. Tests: production apply blocked without two approvals.
- **P5-04 Launch checklist.** Legal, compliance, security, operations and support sign-off recorded in `docs/LAUNCH.md`.

**Gate 5:** all sign-offs recorded; production smoke test passes; rollback tested.

## Cross-cutting tasks (every phase)

- **X-01 Documentation.** Keep `API_AND_DATA.md`, `PRD.md` and `ARCHITECTURE.md` in step with the code. A pull request that changes an endpoint without updating the document fails review.
- **X-02 Accessibility.** Automated axe checks in Playwright for each page, plus a manual keyboard pass per release.
- **X-03 Dependency hygiene.** Weekly dependency update pull request; critical vulnerabilities fixed within 7 days.
- **X-04 Open questions.** Review `docs/OPEN_QUESTIONS.md` at the start of each phase. Close or escalate each item.

## Definition of done for the programme

The suite is in production with live adapters enabled for at least one custody provider and one public chain, the five services are live, an audit export has been reviewed by compliance, and the deployment automation has run successfully in the production account with two approvals and a change ticket.
