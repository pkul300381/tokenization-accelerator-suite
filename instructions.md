# Master Build Instructions: Opus Tokenization Accelerator Suite

Version 1.0 · 2026-10-16 · Read this file first in every session. Then read `skill.md`. Then read the file the current task points to.

## 1. Mission

Build a production-grade web application that lets Opus teams and their clients select, configure and operate tokenization and stablecoin services. The application has five services under one suite shell:

1. **Stablecoin Selector**: choose a US-listed stablecoin, an infrastructure (custody and signing) provider, a layer-2 or permissioned ledger, and wallets. Output a validated configuration that can later drive deployment.
2. **Wallet Adapter**: register, verify and manage wallets across custody types and chains.
3. **Fiat Conversion Bridge**: quote and track fiat-to-stablecoin and stablecoin-to-fiat conversions.
4. **Gas Fee Calculator**: estimate per-transaction network cost and infrastructure fees, for end users and for administrators.
5. **Audit and Reporting**: record every operation and produce filterable, exportable compliance reports.

The suite also has a goal of **automated deployment of the connected tools to AWS** from the saved configuration. That is a later phase. Do not build it before Phase 4 in `BUILD_PLAN.md`.

## 2. Source of truth

When documents disagree, use this order: (1) the user's latest message, (2) `PRD.md`, (3) `API_AND_DATA.md`, (4) `ARCHITECTURE.md`, (5) `BUILD_PLAN.md`, (6) the reference prototype. If you find a conflict you cannot resolve, stop and write the conflict into `docs/OPEN_QUESTIONS.md` rather than guessing.

The reference prototype is a single-file HTML application (about 80 KB) with simulated data. Use it for screen layout, copy, and interaction patterns. Do not copy its simulated data logic into production code. Production code must read from the API.

## 3. Technology defaults

Use these unless the team has recorded a different decision in `docs/DECISIONS.md`.

| Layer | Default | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Component library optional. Keep styles in CSS modules or Tailwind. |
| Routing and state | React Router; TanStack Query for server state | No global state store unless a page needs one. |
| Backend API | Node.js 20 + TypeScript + Fastify (or NestJS if the team prefers) | Validation with Zod, schemas shared with the frontend. |
| Database | PostgreSQL 16 | Migrations with Prisma or Drizzle. |
| Cache and jobs | Redis; BullMQ for background jobs | Used for quote expiry, deployment runs, rate limiting. |
| Auth | OIDC with the Opus identity provider; role-based access | Roles defined in `PRD.md` section 6. |
| Tests | Vitest (unit), Playwright (end-to-end), Supertest or Fastify inject (API) | Coverage floor in `BUILD_PLAN.md`. |
| Infrastructure as code | Terraform (preferred) or AWS CDK | Environments: dev, staging, prod. |
| AWS | ECS Fargate or EKS for services; RDS PostgreSQL; ElastiCache; Secrets Manager; KMS; CloudWatch; WAF; API Gateway or ALB | See `ARCHITECTURE.md`. |
| CI/CD | GitHub Actions | Lint, type-check, test, scan, build, deploy to dev automatically; staging and prod need approval. |

Do not add a dependency that is not needed for the current task. Prefer the standard library and the packages already in the repo.

## 4. Integration boundaries (hard rules)

- **No real funds move in any non-production environment.** Custody and chain calls go through an adapter interface. Non-production uses a sandbox or a mock adapter. Adapters for real providers are enabled only by configuration and only in production after sign-off.
- **Private keys are never handled by application code.** Signing is delegated to the custody provider or to KMS-backed signing. Never log, store or return key material, seed phrases, API secrets or tokens.
- **Secrets come from AWS Secrets Manager** (or the local equivalent in dev). Never commit them. Add `.env.example` with placeholder names only.
- **External vendor features are `[VERIFY]` until confirmed.** Write vendor adapters against interfaces and mark any assumption about a vendor's API with a `// VERIFY:` comment and an entry in `docs/OPEN_QUESTIONS.md`.
- **Stablecoin eligibility comes from the catalogue table**, not from code constants. The prototype lists USDC, PYUSD, RLUSD and USDP as eligible and USDT and FDUSD as not eligible for the catalogue. Treat that list as seed data that compliance can change.

## 5. Security and compliance baseline

Apply OWASP ASVS Level 2 as the minimum for the web tier and API. Specifically:

- All routes require authenticated sessions except the health check. Authorisation is checked on the server for every write.
- Input validation on every endpoint with schema validation. Reject unknown fields.
- Output encoding in the UI. No `dangerouslySetInnerHTML` with user or API data.
- Rate limits on quote, wallet registration and deployment endpoints.
- Audit log entry for every state-changing action: who, what, when, from where, before and after values (values masked where sensitive).
- Personal data is minimised. Wallet addresses are stored; KYC documents are not stored in this application (they are referenced by an identifier from the KYC provider).
- Encryption in transit (TLS 1.2+) and at rest (KMS keys for RDS, S3 and backups).
- Dependency scanning and secret scanning in CI. Fail the build on a known critical vulnerability without an approved exception.

Regulatory context to confirm with Opus compliance and legal before launch (not legal advice): US stablecoin issuance and reserve rules introduced by federal legislation in 2025; state money-transmission licensing for fiat conversion; sanctions screening (OFAC) for wallet addresses and counterparties; the record-keeping obligations that apply to the Audit and Reporting service. Mark each as **[VERIFY]** in code comments where it affects behaviour.

## 6. Code and quality conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- Every API endpoint has a Zod schema, a unit test for the handler's happy path and at least one failure path, and an entry in `API_AND_DATA.md`.
- Every UI page has a loading state, an empty state, an error state and a keyboard-accessible primary action.
- Money is handled as integers in minor units (or as decimal strings) with an explicit currency or token symbol and decimals. Never use JavaScript floats for money.
- Times are stored in UTC and rendered in the user's locale.
- Simulated or demo data is labelled in the UI, and comes from a seed script, never from a hard-coded constant in a component.
- Comments explain why, not what. Keep functions short. One module per service under `services/`.
- Accessibility: WCAG 2.2 AA. Respect `prefers-color-scheme` and `prefers-reduced-motion`.

## 7. Repository layout (default)

```
opus-tac-suite/
  apps/
    web/                 React frontend
    api/                 Fastify backend
  packages/
    shared/              Zod schemas, types, constants, catalogue seed data
    adapters/            custody, chain, FX, gas and KYC adapter interfaces + mocks
  infra/
    terraform/           AWS environments
  docs/                  copies of the pack documents + DECISIONS.md + OPEN_QUESTIONS.md
  scripts/               seed, local dev, report generation
  .github/workflows/     CI and deploy pipelines
```

## 8. How to work with the assistant

1. Start each session by stating the task ID from `BUILD_PLAN.md` and the files you expect to change.
2. Ask for a short plan first. Approve or correct it.
3. Make the change in small steps. Run the tests named in the task after each step.
4. Before you finish, run the checks in `skill.md` section 5 and report the results honestly, including any failing check.
5. Update `docs/OPEN_QUESTIONS.md` and `docs/DECISIONS.md` if the task surfaced an open point or a choice.
6. Do not mark a task complete unless its exit check passes.

## 9. Definition of done (every task)

- Code compiles with no type errors and no lint errors.
- Unit tests for changed logic pass. End-to-end tests pass for changed user flows.
- No secrets, no real keys, no real customer data in code, fixtures or logs.
- New or changed endpoints are documented in `API_AND_DATA.md`.
- New or changed user flows are reflected in `PRD.md` acceptance criteria.
- Audit events emitted for state changes.
- The task's exit check in `BUILD_PLAN.md` is recorded as passed, with evidence.

## 10. What not to do

- Do not invent vendor API fields. If you are unsure, use an adapter interface and a `// VERIFY:` comment.
- Do not replace a sandbox or mock adapter with a live integration to make a demo work.
- Do not add a new service, database or cloud product without a decision record.
- Do not generate the whole application in one response. Work task by task.
- Do not present simulated values, rates or gas estimates as live market data.
