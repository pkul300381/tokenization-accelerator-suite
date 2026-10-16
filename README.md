# Opus Tokenization Accelerator Suite: Build Pack

This folder turns the simulated web prototype into a full-scale application brief that any capable AI coding assistant can execute. It is written to be model-agnostic: the same files work with Claude, ChatGPT, or another code-generation model.

## What is in the pack

| File | Purpose | Who reads it |
|---|---|---|
| `README.md` | This index and how to start | Everyone |
| `instructions.md` | Master build brief: scope, stack, rules, guardrails. Paste or attach first. | The AI assistant, every session |
| `skill.md` | Reusable working procedure: how to take one task from spec to tested code. | The AI assistant, every task |
| `PRD.md` | Product requirements, user stories, acceptance criteria for each service | Product, engineering, QA |
| `ARCHITECTURE.md` | Target system design: components, AWS layout, chain and custody integration, security | Engineering, architects, security |
| `API_AND_DATA.md` | REST endpoints, data model, event contracts | Backend and frontend engineers |
| `BUILD_PLAN.md` | Phased delivery plan, task breakdown, exit criteria | Delivery lead |
| `PROMPT_LIBRARY.md` | Copy-paste prompts for each phase, for Claude or ChatGPT | Engineers driving the assistant |

## Choosing the assistant

The pack does not depend on a specific model. Use whichever assistant your team has licensed and approved.

For Claude, the simplest setup is a Claude Project (or a Cowork folder) containing `instructions.md`, `skill.md`, `PRD.md`, `ARCHITECTURE.md`, `API_AND_DATA.md` and `BUILD_PLAN.md`. Ask Claude to read `instructions.md` and `skill.md` first, then work through `BUILD_PLAN.md` one task at a time. `skill.md` can also be turned into a Claude skill so it loads automatically.

For ChatGPT, create a Project (or a custom GPT) and upload the same files. Put the contents of `instructions.md` into the project instructions, and keep `skill.md` as an uploaded knowledge file. Use a model with strong code generation and long context. If you use ChatGPT's code execution, run the test commands listed in `BUILD_PLAN.md` yourself, because sandbox results vary.

For any other model, treat the files as a context pack. Load `instructions.md` as the system prompt where the tool allows it, otherwise paste it first in the conversation.

## Recommended way to work

Build in the order set out in `BUILD_PLAN.md`. Do not ask the assistant to generate the whole application in one pass. Each task has a single goal, a list of files to touch, tests to run, and an exit check. Keep one task per session where possible, and commit after each task passes.

## Assumptions in this pack

The pack assumes the scope in the Opus Tokenization Accelerator Suite prototype: five services (Stablecoin Selector, Wallet Adapter, Fiat Conversion Bridge, Gas Fee Calculator, Audit and Reporting), a service selection shell, and an eventual goal of automating deployment of the connected tools to AWS.

Vendor features, chain parameters, stablecoin listing status and regulatory positions are not verified in this pack. Every such item is marked **[VERIFY]** and must be confirmed against current vendor documentation and by Opus compliance and legal before build or launch. Nothing in this pack authorises moving real funds.

## Status

Draft v1.0, dated 2026-10-16. Owner: TAC service line. Update the version and date in each file when you change it.
