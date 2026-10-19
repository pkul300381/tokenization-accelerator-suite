# Modular web app

This Vite + React 18 + TypeScript app is the modular successor to the root-level HTML demo. The original prototype remains available as a comparison/reference.

## Run

From the repository root:

```sh
pnpm install
pnpm dev:web
```

Build with `pnpm build:web` and type-check with `pnpm typecheck:web`. Node.js 20.19 or newer is required by the Vite toolchain.

## Structure

- `src/app/` owns routing, the shared shell, and theme state.
- `src/components/` contains reusable presentation components.
- `src/features/catalogue/` contains service and accelerator display metadata.
- `src/features/demo/` holds presentation-only fixtures; these are not production data.
- `src/features/home/`, `services/`, `platform/`, and `architecture/` own feature pages and local styles.
- `src/lib/` contains small domain-independent helpers such as integer minor-unit formatting.
- `scripts/sync-reference-assets.mjs` copies the root-level Opus logo and architecture document into Vite's ignored `public/` folder before dev/build.

## Current limits

Pages show clearly labeled demo values and do not call the API or move funds. The next integration step is to replace the demo fixture module with typed API client hooks while preserving the present page/component boundaries. Authentication and role guards are not yet connected.
