# Skill: Build One Task From Spec to Tested Code

Version 1.0 · 2026-10-16 · Use this procedure for every task in `BUILD_PLAN.md`. It works in Claude (as a skill or project file) and in ChatGPT (as a project knowledge file or custom GPT instruction). Read `instructions.md` first.

## When to use this skill

Use it whenever you are asked to implement, change, test or document any part of the Opus Tokenization Accelerator Suite. Do not use it for a question that needs no code change.

## Inputs you need

- The task ID (for example `S1-03`) and its block in `BUILD_PLAN.md`.
- The PRD section and acceptance criteria it references.
- The API and data contracts it touches in `API_AND_DATA.md`.
- Existing code in the repo for the same module. Read it before writing anything.

If any of these is missing, say so and ask for it. Do not invent a contract.

## Procedure

### Step 1: Restate the task (2 to 4 sentences)

State the goal, the acceptance criteria you will satisfy, and what is out of scope. If the task asks for something that section 4 of `instructions.md` forbids, stop and report it.

### Step 2: Inspect before editing

List the files that exist for this module. Read the relevant ones. Identify the existing patterns: how validation is done, how errors are returned, how the adapter is called, how tests are structured. Follow those patterns unless they are wrong, and if they are wrong, say so rather than silently mixing styles.

### Step 3: Plan (show it, then proceed)

Produce a short plan:

1. Files to create or change, with one line each.
2. Schemas or types to add to `packages/shared`.
3. Tests to write first (name them).
4. Any `// VERIFY:` items and where they will go in `docs/OPEN_QUESTIONS.md`.

Proceed without waiting only if the user has said they want autonomous execution for this task. Otherwise wait for approval.

### Step 4: Write tests first for logic

For each acceptance criterion, write a test that fails for the right reason. For pure logic (fee calculation, conversion rounding, eligibility rules, report filtering) write unit tests with explicit expected numbers. For API handlers, write one happy-path and at least two failure-path tests (validation error, authorisation error, not-found or conflict).

### Step 5: Implement

- Schema first (Zod in `packages/shared`), then handler, then service logic, then UI.
- Keep money in integer minor units or decimal strings. Keep times in UTC.
- Put external calls behind an adapter interface. Add the mock implementation at the same time.
- Emit an audit event for every state change.
- Keep functions small. Name things after the business concept, not the framework.

### Step 6: Run the checks

Run and record the result of each of the following. If a check cannot run in your environment, say so explicitly and explain how the user can run it.

1. Type check: `pnpm -r typecheck`
2. Lint: `pnpm -r lint`
3. Unit tests: `pnpm -r test`
4. For UI tasks: end-to-end test for the changed flow: `pnpm --filter web e2e`
5. Secret scan: confirm no key-like strings were added (`git diff` review, plus the CI secret scanner if available).
6. Contract check: every endpoint you touched is in `API_AND_DATA.md` with matching request and response shapes.
7. Route and event check: any new public route is in the gateway route table (`packages/shared/routes.ts`) and section 14 of `API_AND_DATA.md`; any new event name is in section 10 of `API_AND_DATA.md`.
8. Compliance check: any write that moves value, changes a configuration or registers a wallet calls the Compliance & Risk Engine, and the decision is recorded. Run the cross-cutting test that proves this.

### Step 7: Verify the user-facing behaviour

For a UI change, run the app locally and walk the golden path and one error path. Check the loading, empty and error states. Check keyboard navigation and the focus order. Check that the layout works at 400 px width without horizontal scroll. Check both light and dark themes. Record what you checked.

For an API change, call the endpoint with a valid request and an invalid request and show the responses.

### Step 8: Report

Use this format in the final message for the task:

- **Task:** ID and title
- **Changed:** list of files (grouped by package)
- **Acceptance criteria:** each criterion, marked Met, Partly met, or Not met, with evidence
- **Checks:** each command from step 6 with pass or fail
- **Open items:** anything added to `docs/OPEN_QUESTIONS.md`, including every `[VERIFY]` item
- **Next task:** the next ID in `BUILD_PLAN.md`

Do not claim a check passed unless you ran it and saw it pass.

## Module-specific notes

### Stablecoin Selector (S1)

The configuration flow has five steps: stablecoin, infrastructure provider, ledger (public or permissioned), wallets, and review. The output is a `DeploymentBlueprint` object (see `API_AND_DATA.md`). Eligibility of a stablecoin comes from the catalogue table. A provider must support every chain in the selected ledger to be selectable. Validate the whole configuration on the server, not only in the browser. The blueprint must be deterministic: the same inputs always produce the same JSON, so it can be diffed and version-controlled.

### Wallet Adapter (S2)

Wallet types are custodial (provider-held keys), MPC (threshold keys through the provider), and smart-contract wallets (account abstraction). Registration must verify the address format for the target chain before storing it. Verification of ownership uses a signed challenge; never store a private key or a seed phrase. Remove is a soft delete with an audit entry.

### Fiat Conversion Bridge (S3)

Quotes have an expiry time. A quote cannot be executed after expiry; the server rejects it, and the UI shows the expiry countdown. Spread and fee are shown separately. Rounding follows a single documented rule (round half to even at the currency's minor-unit precision, unless compliance specifies otherwise [VERIFY]). Settlement is a state machine: `quoted`, `accepted`, `funded`, `settling`, `settled`, `failed`, `expired`. Every transition is audited.

### Gas Fee Calculator (S4)

The calculator separates the network fee (from the chain's fee model) from the infrastructure fee (from the provider's fee schedule in basis points). The end-user view and the administrator view show different breakdowns but use the same engine. Congestion is an input multiplier, not a live market feed, unless a live gas-price adapter is configured. Label any simulated or cached gas figure as such.

### Audit and Reporting (S5)

Every state change writes an immutable audit row. Reports are generated from the audit table with filters for period, status, chain and transaction type. Exports are CSV first, then PDF. Each export records who generated it and when, and the filter parameters, so it can be reproduced. Audit rows are never updated or deleted by the application.

### AWS deployment automation (later phase)

The deployment run takes a `DeploymentBlueprint`, renders Terraform from templates, runs a plan, waits for approval, applies, and records each step. It runs as a background job with resumable steps. The first implementation targets a sandbox AWS account only. Do not implement production apply until Phase 5 sign-off.

### Compliance and Risk Engine (S6)

Build rule sets as data, never as branches in handler code. Every decision carries a stable reason code, a score, the rule set version and an input hash. A `block` must be impossible to override through any endpoint, and the test for that is required, not optional. When a mandatory data source is down, follow the fail-closed policy in `ARCHITECTURE.md` section 13 and test it. Never copy raw customer data into the decision record.

### Notification Service (S7)

Every notification is driven by an event with an ID, and the dedupe key is built from the event ID plus the transaction hash. Templates are rendered from an allow-list of fields, so a new field cannot leak into chat or paging by accident. Test escalation with a fake clock, not real timers. The transaction watcher writes its row and publishes its event through the outbox, so an event never exists without its row. A failed transaction always reaches a human; if a channel fails, the failure itself is alerted through another channel.

### Token Gateway (S8)

The gateway holds routing, authentication, scopes, limits and the version gate, and nothing else. Routes are added in the route table first, and the contract test then forces the documentation to match. Never log bodies. Never let a route bypass the gateway by calling a domain service from a client. Mobile clients get short-lived tokens; the gateway never stores signing keys.

## Common failure modes to avoid

- Writing float arithmetic for money or fees.
- Trusting client-side validation alone.
- Hard-coding catalogue values, chain IDs, provider names or fee rates inside components.
- Forgetting the audit event on a write path.
- Letting a background job run twice on retry. Use idempotency keys.
- Showing simulated numbers without a label.
- Adding a dependency to solve a one-line problem.
- Reporting "tests pass" without running them.
- Letting a client call a domain service directly, bypassing the Token Gateway.
- Adding an override path for a `block` compliance decision, in the UI or the API.
- Putting full wallet addresses, customer identifiers or secrets into a notification, a chat message or a log line.
- Sending a second page for a retried event because the dedupe key was missing.
- Adding a public route in code without updating the route table and the contract test.

## Output discipline

Keep the final report short and factual. Do not describe what you would do next beyond naming the next task. Do not praise the code.
