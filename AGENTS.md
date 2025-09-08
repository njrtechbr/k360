# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router (pages, layouts, middleware).
- `src/components`: Reusable UI components (`PascalCase.tsx`).
- `src/services`: Domain logic (`camelCase.ts`).
- `src/lib`: Shared utilities (Prisma client, validation, errors).
- `src/hooks`: React hooks (`useXyz.ts[x]`).
- `src/providers`: Context providers.
- `src/types`: App-specific TypeScript types.
- `src/__tests__`: Unit/integration tests.
- `prisma/migrations`: Database schema history.
- `scripts`: CLI helpers (backup tooling).
- `docs`: Ops/feature docs; `docs/backups/` stores generated artifacts.

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js at http://localhost:3000.
- `npm run build` / `npm start` — Production build and serve.
- `npm run lint` / `npm run typecheck` — ESLint and TS checks.
- `npm test` / `npm run test:watch` — Run Jest tests.
- `npm run test:coverage` — Coverage report.
- Backup CLI: `npm run backup:create`, `npm run backup:list`, `npm run backup:validate`.
- Database (requires `.env`): `npx prisma migrate dev` then `npm run db:seed`.

## Coding Style & Naming Conventions
- Language: TypeScript; 2-space indentation; semicolons required.
- Components in `src/components`: `PascalCase.tsx`.
- Hooks in `src/hooks`: `use-` prefix (e.g., `useBackupMonitoring.ts`).
- Services/libs: `camelCase.ts` in `src/services` and `src/lib`.
- Lint with Next.js ESLint: `npm run lint` (fix issues before PRs).

## Testing Guidelines
- Framework: Jest + Testing Library (jsdom).
- Naming: unit `*.test.ts(x)`; integration `*.integration.test.ts`.
- Fast local run: `npm test`; CI: `npm run test:ci`; coverage: `npm run test:coverage`.
- Mock external I/O; prioritize `src/services` and `src/lib`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat:`, `fix:`, `docs:`) with concise, imperative subjects.
- PRs: include purpose, linked issues, test evidence (logs/screenshots); note schema changes under `prisma/migrations`.
- Ensure lint, typecheck, and tests pass before requesting review.

## Security & Configuration Tips
- Never commit secrets; use `.env.local`.
- Minimum env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Backups: configure storage path (see `docs/README-backup.md`).
- After dependency changes, run `npm install` (triggers `prisma generate`).

## Agent-Specific Notes
- This AGENTS.md governs the repo root; nested AGENTS.md may override locally.
- Make minimal, focused changes aligned with existing patterns; avoid unrelated fixes.
