# Repository Guidelines

## Project Structure & Module Organization

Monorepo managed with `pnpm` workspaces. Code lives in `packages/*`:
- `packages/gitcode-api` — core API client.
- `packages/gitcode-cli` — CLI (`gitcode`).
- `packages/gitcode-actions` — automation/workflows.
- `packages/server` — backend server.
- `packages/gitcode-dashboard` — web UI.
Docs mirror packages in `docs/*` (e.g., `docs/gitcode-cli`). Shared config at root: `tsconfig.base.json`, `eslint.config.cjs`, `prettier.config.cjs`, `pnpm-workspace.yaml`. Utility scripts in `scripts/`. Git hooks live under `.husky` when configured.

## Build, Test, and Development Commands

- Install: `pnpm i`
- Build all: `pnpm build`
- Build one: `pnpm --filter @xbghc/gitcode-api build`
- Dev (all): `pnpm dev`
- Dev (focused): `pnpm dev:core`, `pnpm dev:server`, `pnpm dev:dashboard`
- Lint/format: `pnpm lint`, `pnpm format`
- Docs: `pnpm docs:dev`, `pnpm docs:build`, `pnpm docs:preview`
- Clean: `pnpm clean`

## Coding Style & Naming Conventions

TypeScript ESM (NodeNext) with strict compiler options. Prettier: 2 spaces, single quotes, semicolons, trailing commas, 100-character width. ESLint with `@typescript-eslint` is authoritative—fix all errors before PR. Naming: files lowercase (`client.ts`), types PascalCase, functions/variables camelCase.

## Testing Guidelines

No global test runner yet. Place small, deterministic unit tests alongside sources as `*.test.ts`; stub network calls. Validate via `pnpm build` and `pnpm lint`. For ad‑hoc execution, run `tsx path/to/test.ts` when appropriate.

## Commit & Pull Request Guidelines

Commits: imperative mood, scoped, and logically grouped. When behavior changes in a package, update matching docs in `docs/<package>` (e.g., `docs/gitcode-api`, `docs/gitcode-cli`). PRs must include a clear description, linked issues, and logs/screenshots for CLI/UX changes. Confirm `pnpm build` and `pnpm lint` pass. Avoid bypassing docs checks (`SKIP_DOCS_CHECK=1`) unless explicitly approved.

## Security & Configuration Tips

Never commit secrets. Use `.env` (e.g., `GITCODE_TOKEN`, `GITCODE_API_BASE`). The CLI stores auth at `~/.gitany/gitcode/config.json`. Prefer clarity over backward compatibility per project guidance.
