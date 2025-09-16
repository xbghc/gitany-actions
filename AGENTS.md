# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by `pnpm` with TypeScript.
- `packages/gitcode`: Core library for GitCode API/auth and URL parsing.
- `packages/cli`: CLI exposing auth and parsing commands (bin: `gitcode`).
- `docs`: VitePress site mirroring packages (`docs/gitcode`, `docs/cli`).
- `scripts`: Local utilities (e.g., docs sync check).
- Git hooks: `.husky/pre-commit` runs a docs-sync check.

## Build, Test, and Development Commands
- Install: `pnpm i` (Node >= 18.17).
- Build all: `pnpm build` (recurses packages).
- Dev (watch all): `pnpm dev`.
- Lint / Format: `pnpm lint` / `pnpm format`.
- Per‑package dev/build: `pnpm --filter @gitany/cli dev` or `pnpm --filter @gitany/gitcode build`.
- Docs: `pnpm docs:dev`, `pnpm docs:build`, `pnpm docs:preview`.
- Clean: `pnpm clean`.

## Coding Style & Naming Conventions
- Language: TypeScript (ESM). Strict compiler options shared via `tsconfig.base.json`.
- Prettier: 2‑space indent, semicolons, single quotes, trailing commas, width 100.
- ESLint: `@typescript-eslint` rules; ignore `dist/`, `node_modules/`.
- Naming: files lower‑case (e.g., `client.ts`), types `PascalCase`, functions/vars `camelCase`.

## Testing Guidelines
- No test runner configured yet. If adding tests:
  - Place alongside source as `*.test.ts`.
  - Keep units small and deterministic; mock network where feasible.
  - Ensure `pnpm build` and `pnpm lint` pass before pushing.

## Commit & Pull Request Guidelines
- Commits: clear, imperative mood; group related changes.
- Docs sync is required when code changes affect behavior:
  - `packages/gitcode` → update `docs/gitcode/*`
  - `packages/cli` → update `docs/cli/*`
- Pre‑commit hook enforces the docs check; to bypass temporarily (not recommended):
  ```bash
  SKIP_DOCS_CHECK=1 git commit -m "..."
  ```
- PRs: include description, relevant screenshots/output, and confirm docs updated. Ensure `pnpm build` and `pnpm lint` succeed.

## Security & Configuration Tips
- Do not commit real tokens. Use a local `.env` for development (examples):
  ```
  GITCODE_TOKEN=
  GITCODE_API_BASE=https://gitcode.com/api/v5
  GITCODE_AUTH_STYLE=bearer
  GITCODE_AUTH_HEADER=
  ```
- The CLI stores auth at `~/.gitany/gitcode/config.json`.

## Appendix

- 不考虑向后兼容，保持代码的简洁
