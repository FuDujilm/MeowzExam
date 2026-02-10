


## Project Structure & Module Organization
The `app/` directory houses App Router route segments such as `practice`, `exam`, and `admin`, each with route-specific `page.tsx` files and server actions. Shared UI lives in `components/` (with reusable primitives under `components/ui`) while admin dashboards stay in `components/admin`. Cross-cutting server logic is grouped in `lib/` for AI integrations, auth, auditing, and Prisma helpers; import them with the `@/*` path alias configured in `tsconfig.json`. Database schema and migrations belong in `prisma/`, types in `types/index.ts`, static assets in `public/`, and data-verification scripts like `test-api.js` remain at the project root.

## Build, Test & Development Commands
- `pnpm install`: Sync dependencies; keep `pnpm-lock.yaml` authoritative.
- `pnpm dev`: Run the Next.js dev server on port 3001 with Turbopack.
- `pnpm build` then `pnpm start`: Produce and preview the optimized production bundle.
- `pnpm lint`: Execute the ESLint stack; resolve warnings before opening a PR.
- `pnpm prisma generate` + `npx prisma migrate dev`: Regenerate the client and apply schema changes to the local database.

## Coding Style & Naming Conventions
- Prefer TypeScript-first React components, adding `'use client'` only when hooks demand it and isolating server logic inside route handlers or `lib/`.
- Follow two-space indentation, single quotes, and PascalCase filenames for components (e.g., `UserExplanationForm.tsx`); use camelCase for vars and functions.
- Reuse primitives from `components/ui` before introducing new variants; co-locate feature-specific styling in the owning file, keeping globals in `app/globals.css`.
- Let ESLint (`next/core-web-vitals`, `next/typescript`) guide quality; prefix intentionally unused params with `_` to satisfy the configured rules.

## Testing Guidelines
- Use `pnpm lint` as the minimum gate and expand with targeted tests near logic-heavy helpers in `lib/` or route handlers.
- Run manual sanity scripts (`node test-api.js`, `node test-mapping.js`, `node test-correct-flow.js`) whenever you touch exam data mapping or AI payloads.
- Capture new reproductions in the `test-*.js` pattern or document alternative commands here when adding automation.

## Commit & Pull Request Guidelines
- Write imperative, scope-prefixed commits (`feat: add practice streak card`) to keep history readable once the repo gains commits.
- Reference related issues or Notion tasks in the body, and call out schema or environment updates that reviewers must apply.
- PR descriptions should summarize user impact, include verification steps (commands run, scripts executed), and attach UI screenshots when visuals change.

## Configuration & Security
- Copy `.env.example` to `.env` and populate `DATABASE_URL`, NextAuth secrets, mail credentials, and AI provider keys before running `pnpm dev`.
- Keep secrets, generated Prisma client output, and downloaded datasets out of version control; rely on `.gitignore` and avoid logging tokens.
- Use `check-data.js` to validate imported question banks and `lib/audit.ts` to record notable state transitions instead of ad-hoc logging.
