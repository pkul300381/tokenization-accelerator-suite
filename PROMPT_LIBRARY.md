# Prompt Library: Driving the Build With Claude or ChatGPT

Version 1.0 · 2026-10-16 · Copy the prompt, replace the bracketed parts, and attach the named files. The prompts are the same for either assistant. Where a step needs a specific model feature (long context, code execution), the note says so.

## 0. Session start (every session)

```
You are the engineer on the Opus Tokenization Accelerator Suite.
Read instructions.md and skill.md in full before doing anything.
Then read the sections of PRD.md, API_AND_DATA.md and ARCHITECTURE.md that task [TASK-ID] refers to.
Summarise the task in 3 sentences, list the files you expect to change, and wait for my approval of the plan.
Do not write code until I approve.
```

Attach: `instructions.md`, `skill.md`, `PRD.md`, `API_AND_DATA.md`, `ARCHITECTURE.md`, `BUILD_PLAN.md`.

## 1. Repository scaffold (F0-01)

```
Task F0-01. Create the monorepo scaffold described in instructions.md section 7.
Use pnpm workspaces, TypeScript strict mode, ESLint, Prettier and Vitest.
Create apps/web (Vite React TypeScript), apps/api (Fastify TypeScript), packages/shared and packages/adapters.
Each package has one passing smoke test. Provide the full file list and the exact commands to run the checks.
Show the root package.json and pnpm-workspace.yaml first, then the rest.
```

## 2. Shared contracts (F0-02)

```
Task F0-02. Implement Zod schemas in packages/shared for the objects in API_AND_DATA.md sections 2 to 7 and the problem response in section 1.
Write valid and invalid sample tests for each schema.
Money fields must be decimal strings with a regex check. Do not use number for money.
At the end, list every schema name and the section of API_AND_DATA.md it comes from.
```

## 3. Money utilities (F0-03)

```
Task F0-03. Implement packages/shared/money.ts with decimal-string add, subtract, multiply by a rate, and round to a given number of decimals.
Use a decimal library (decimal.js or big.js) and justify the choice in one sentence.
The rounding rule is a placeholder: round half to even, and mark it // VERIFY: compliance to confirm.
Write at least 30 tests with explicit expected values, including negative amounts and 18-decimal stablecoin amounts.
```

## 4. Stablecoin Selector validation (S1-02)

```
Task S1-02. Implement the server validation engine for the Stablecoin Selector.
Rules: AC-S1-1 (eligible US-listed coins only) and AC-S1-2 (provider must support every selected coin and the chain).
Return issues with a path, a code and a message, as in API_AND_DATA.md section 3.
Write one test per rule and three combined cases.
Do not read catalogue values from constants; read them from the repository interface, which the tests will fake.
```

## 5. Blueprint canonical JSON (S1-03)

```
Task S1-03. Implement blueprint serialisation.
Requirements: the same configuration always produces byte-identical JSON; keys are sorted; numbers are strings where they are money; a sha256 checksum is stored with each version.
Write a test that serialises the same input twice and compares bytes, and a test that a changed field changes the checksum.
```

## 6. Wallet address validation (S2-02)

```
Task S2-02. Implement address validation for EVM, Solana and XRPL in packages/shared/chains.ts.
Give the exact rule you apply for each chain and cite where you took it from. If you are not certain of a rule, mark it // VERIFY: and add it to docs/OPEN_QUESTIONS.md.
Tests: at least three valid and three invalid addresses per chain. Use only well-known example addresses from public documentation, and state the source of each example.
```

Note: use ChatGPT's code execution or a local run to confirm checksum tests, because a model can misremember checksum algorithms.

## 7. Ownership verification (S2-03)

```
Task S2-03. Implement ownership verification for a wallet using a server-issued challenge and a signature supplied by the client.
The application must never receive or store a private key. Tests use a test key pair generated in the test suite.
Cover: valid signature accepted; wrong key rejected; expired challenge rejected; replayed challenge rejected.
Explain the threat each test prevents, in one line each.
```

## 8. FX quote and execution (S3-01, S3-02)

```
Task S3-02. Implement quote execution and the conversion state machine from API_AND_DATA.md section 5 and PRD.md AC-S3-3 and AC-S3-4.
Use the sandbox FX adapter. Expired quotes return 410 and create an audit event and an exception.
Write a table-driven test covering every legal and illegal transition.
Use a fake clock; do not use real timers in tests.
```

## 9. Gas engine (S4-01)

```
Task S4-01. Implement the gas engine as a pure function in packages/shared/gas.ts.
Inputs: chain, txType, monthlyVolume, congestion (1 to 5), marginPct (0 to 20), view.
Outputs: perTx network, infrastructure and total; monthly total; basis = estimate.
Write at least 40 table-driven tests with the expected values written out, not calculated in the test.
Do not call any network service. Chain fee parameters come from a static model file that I will review.
```

## 10. Audit cross-cutting test (S5-01)

```
Task S5-01. Build an audit writer function and a test that proves every state-changing route writes exactly one audit row.
The test enumerates all POST, PATCH, PUT and DELETE routes from the Fastify route table, calls each with a valid request, and counts audit rows.
Fail the test if any write route is missing from the allow-list of routes that are exempt, and list the exempt routes with reasons.
```

## 11. Wizard UI (S1-04)

```
Task S1-04. Build the five-step Stablecoin Selector wizard in apps/web.
Use the prototype (the single-file HTML app) for layout and copy only; do not copy its simulated data code.
Data comes from the API. Each step has loading, empty and error states. The provider list shows disabled providers with a reason.
Write a Playwright test for the golden path and one error path. Check keyboard navigation between steps.
Show the file tree you will create before the code.
```

Attach: the prototype HTML file (for layout reference only).

## 12. Accessibility and responsive check (X-02)

```
Run an accessibility review of the page [PAGE NAME] against WCAG 2.2 AA.
Check: heading order, labels for every input, focus visibility, contrast in both themes, keyboard operation of every control, chart text alternative, reduced-motion behaviour.
Produce a table of findings with severity, file and line, and the fix. Apply the fixes for severity high and critical only, and re-run the tests.
```

## 13. Deployment renderer (D4-01)

```
Task D4-01. Implement a renderer that takes a blueprint version and produces Terraform module inputs in a run-specific directory.
Do not include any credentials. Include a golden-file test for three sample blueprints.
List every Terraform module you reference and mark each one as existing in the repo or to be created.
Do not run terraform apply. You may run terraform validate and terraform plan only against the sandbox backend configuration.
```

## 14. Pre-release review

```
Review the diff for [TASK-ID] against instructions.md section 5 (security baseline) and section 9 (definition of done).
Report: any secret or key-like string; any float used for money; any missing audit event; any endpoint not in API_AND_DATA.md; any missing role check; any simulated value shown without a label.
Report each finding with file and line. If there are none in a category, say so.
```

## 15. Documentation sync (X-01)

```
Compare the endpoints in apps/api with API_AND_DATA.md. List any endpoint that is missing from the document, any document entry with no implementation, and any mismatch in request or response fields.
Propose the exact text changes to API_AND_DATA.md. Do not edit the document until I approve.
```

## 16. Token Gateway route table and contract test (G8-01)

```
Task G8-01. Create packages/shared/routes.ts as the single route table for the Token Gateway.
Each entry has: path prefix, upstream service, required scopes, rate limit class, and mobile allowed (boolean).
Use the entries in API_AND_DATA.md section 14 exactly. Do not add a route that is not in that section; if you think one is missing, list it and stop.
Write a contract test that parses section 14 of API_AND_DATA.md and fails if the table and the document differ in path, upstream, scopes or mobile flag.
Show the file, the test, and the output of the test run.
```

## 17. Compliance rule evaluation (C6-01)

```
Task C6-01. Implement the Compliance & Risk Engine rule evaluator in apps/api/src/compliance.
Rule sets are versioned JSON data. The evaluator returns outcome, score (0 to 100), reasons (stable codes plus display messages), ruleSetVersion and evaluatedAt, as in API_AND_DATA.md section 12.
Requirements: the same inputs and rule set give the same output; an unknown reason code is rejected at build time; a block outcome has no override path.
Write tests with explicit expected scores and outcomes. Use a fake clock for evaluatedAt.
Do not call the screening or KYC adapters directly; accept their results as input and test the fail-closed behaviour from ARCHITECTURE.md section 13.
```

## 18. Notification dedupe and escalation (N7-02, N7-04)

```
Task N7-02 and N7-04. Implement the notification consumer with route matching, a dedupe key (event ID plus transaction hash), a thread key (transaction row ID), and escalation timers.
Escalation rules: critical unacknowledged after 15 minutes moves to the next on-call tier; high unacknowledged after 60 minutes moves to the support lead; acknowledgement stops escalation.
Templates may only use fields on the allow-list in API_AND_DATA.md section 13. Full wallet addresses must never appear; add a test that renders each template with a full address in the input and checks the output.
Use a fake clock for all timer tests. Show the test output and list any [VERIFY] items you added to docs/OPEN_QUESTIONS.md.
```

## Tips for either assistant

- Keep one task per session and start a fresh session for each phase, so the context stays focused.
- If the assistant proposes a dependency or a service that is not in `ARCHITECTURE.md`, ask it to write a decision record in `docs/DECISIONS.md` before adding it.
- If the assistant invents a vendor field, ask: "Which document or official source supports this field? If none, replace it with an adapter method and a VERIFY comment."
- When a run is interrupted, ask: "Summarise what is done, what is not, and which checks have passed, with evidence."
- For ChatGPT, prefer uploading the files to the project rather than pasting them, and ask it to quote the section it relies on.
- For Claude, the same files can sit in a Project; ask it to cite the file and section name when it uses a requirement.
