# Repository Guidelines

## Project Structure & Module Organization
This monorepo uses `pnpm` workspaces. Core logic lives in `packages/gitcode`, the CLI in `packages/cli`, and documentation in `docs` (mirrors package structure). Utility scripts sit in `scripts`, and Git hooks live under `.husky`. Keep shared config in root `tsconfig.base.json` and `.eslintrc.cjs`.

## Build, Test, and Development Commands
Install dependencies with `pnpm i`. Run `pnpm build` to compile every package, or target a single package (e.g., `pnpm --filter @gitany/gitcode build`). Use `pnpm dev` for watch mode across packages. Docs tooling ships with `pnpm docs:dev`, `pnpm docs:build`, and `pnpm docs:preview`. `pnpm lint` and `pnpm format` enforce style.

## Coding Style & Naming Conventions
All code is TypeScript (ESM) with strict compiler options. Prettier enforces 2-space indent, single quotes, semicolons, trailing commas, and 100-character width. ESLint with `@typescript-eslint` rules is authoritative. Name files in lowercase (`client.ts`), types in PascalCase, functions and variables in camelCase.

## Testing Guidelines
No test runner exists yet. Add lightweight unit tests alongside sources as `*.test.ts`. Keep tests deterministic and stub network calls. Ensure new tests succeed via `pnpm build` and `pnpm lint` until a test task exists.

## Commit & Pull Request Guidelines
Write commits in imperative mood and group related changes. If code behavior shifts in `packages/gitcode` or `packages/cli`, update the matching docs (`docs/gitcode/*`, `docs/cli/*`). PRs must confirm lint/build status and explain the change; include screenshots or logs when UX or CLI output changes. The pre-commit hook runs the docs sync check; set `SKIP_DOCS_CHECK=1` only if explicitly approved.

## Security & Configuration Tips
Never commit secrets. Use `.env` with keys such as `GITCODE_TOKEN` and `GITCODE_API_BASE`. The CLI stores auth under `~/.gitany/gitcode/config.json`. Favor clarity over backwards compatibility per project guidance.
