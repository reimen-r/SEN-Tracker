# AGENTS.md — SEN Venezuela IODA Outage Monitor

React + Vite + Express (TypeScript) app that infers Venezuelan power-grid outages (SEN) from IODA telemetry (Georgia Tech). Spanish UI, single flat package. Server-side Gemini analysis. Modals lazy-loaded.

## Commands

Two hosts touch this repo. **Windows (primary):** prefix with `npm.cmd`, not `npm`/`bun` (`npm.ps1` is blocked, Bun not installed). **Linux** (this repo is a Windows drive mounted under `/run/media/…`): `npm.cmd` does not exist — run the same scripts with `npm run …` / `npx …`.

- `run dev` — dev server (tsx `server.ts` + Vite HMR) on `0.0.0.0:3000`
- `run lint` — gate: `tsc --noEmit && eslint .` (must be green)
- `run lint:tsc` / `run lint:eslint` — individually
- `run test` — Vitest once; colocate `*.test.ts` next to source
- `run build` — `vite build` + esbuild `server.ts` → `dist/server.cjs` (must pass)
- `run start` — prod server; **requires `NODE_ENV=production`** (else it boots the dev Vite middleware)
- `run clean` — removes `dist/` (node-based)

## Architecture

- **Server** — thin entry `server.ts` (dev Vite middleware / prod listen) + modules in `server/`:
  - `app.ts` — builds Express app: `trust proxy`, **per-route body limits** (`/api/analyze-gemini` 1mb, `/api/ioda` 100kb), request logging, health, static + SPA fallback.
  - `gemini.ts` — `POST /api/analyze-gemini` (lazy `GoogleGenAI`, Spanish SEN system prompt, rate-limited 10 req/min/IP via `RateLimiter`).
  - `iodaProxy.ts` — `POST /api/ioda/query`: entityCode whitelist (`VE` + 24 `VE-[A-Z]`), `AbortSignal.timeout(15s)`, TTL cache 5 min + in-flight dedupe.
  - `rateLimit.ts` (`RateLimiter`, lazy `.unref()` cleanup timer), `cache.ts` (`TtlCache`, lazy expiry), `config.ts` (env: `PORT`, `GEMINI_API_KEY`, `TRUST_PROXY`, `DIST_PATH`).
- **Client** — `src/main.tsx` → `src/App.tsx`. State: scenario datasets + selected state + view. `DataIngestionModal` / `GeminiAnalystModal` lazy-loaded; views wrapped in `ErrorBoundary`. Session persisted to `localStorage` key `sen-ioda:v1:app` (bump the `v1` on schema change; loader validates schema and falls back to defaults).
- **Data** — `src/data/entityRegistry.ts` (24 federal entities + `VENEZUELA_ENTITY_IDS`, shared with the server proxy whitelist), `src/data/syntheticTelemetry.ts` (the **only** telemetry generator: `generateScenario(profile)`; presets and the modal slider generator are thin adapters), `src/data/venezuelaGrid.ts` (incident presets as static profiles), `src/services/iodaApi.ts` (live fetch + v2 response parser → 0–100 normalization).
- **Analysis** — `src/services/analyzer.ts` is a **facade**: `analyzeIodaDatasets(datasets)` composes `stateClassifier.ts` (per-entity inference: baseline, onset, recovery, night/ISP filters, severity thresholds — all live here), `nationalSynthesis.ts` (executive summary, recovery analysis, alert), and `proseRenderer.ts` (markdown + broadcast from one interface). Thresholds changed? Edit `stateClassifier.ts`, not the facade.
- **Utils** — `src/utils/time.ts`, `export.ts` (CSV BOM + injection guard, JSON, SVG→PNG), `storage.ts`.

## Gotchas (agent would likely get these wrong)

- **TypeScript is pinned to ~5.9** (was TS 7/tsgo). Do NOT bump to 7.x: `typescript-eslint` peer-requires `typescript <6.1.0` and tsgo lacks the JS compiler API the parser needs.
- **Express 5 / path-to-regexp v8 rejects `app.get('*')`** — it crashes at startup. SPA fallback must be `app.use((req,res,next) => …)` (skip `/api/` paths → 404 JSON, else send `index.html`). Don't "fix" it back to `*`.
- **`node_modules` is win32-only: `npm run test` / `build` / `dev` fail on Linux** ("Cannot find native binding" — rolldown, lightningcss, `@tailwindcss/oxide`, esbuild). The `-linux-x64-gnu` binding packages were added to `node_modules` by hand and are untracked (not in `package-lock.json`); re-add them after any fresh `npm install` on Linux and don't touch the lockfile.
- **VET (UTC-4) math lives only in `src/utils/time.ts`** (`Intl` `America/Caracas`). Never inline UTC-4 arithmetic; the app already had 3 copies of that bug. `formatVET` is re-exported from `analyzer.ts` for compat.
- **IODA v2 response** is `{ data: [[ { datasource, values: "1 2 3", from, step } ]] }`; datasources: `ping-slash24` (probing), `merit-nt`/`ucsd-nt` (darknet), `bgp`. Normalized to 0–100 in `iodaApi.ts`. Proxy caches upstream 5 min — watch mode polls respect it.
- **Charts are hand-rolled SVG** (`TelemetryChart.tsx`); recharts was removed for size. Extend the SVG, don't add a chart lib.
- **Vigilancia** auto-polls every 1/5/15 min and notifies only on **severity escalations** (banner + `Notification`). The escalation logic (ranking, seeding, batch fetch) lives in `src/services/vigilance.ts` (pure functions, injectable fetch); it seeds the previous-severity map from the current report on enable to avoid a false first alert.
- **Print** (`@media print` in `index.css`) hides `.no-print` + all controls, forces light report. The "Imprimir" button calls `window.print()`.
- **Tailwind v4**: `@import "tailwindcss"` in `index.css`, config via `@tailwindcss/vite` plugin — there is **no** `tailwind.config.js`.
- **`vite.config.ts`**: `server.hmr`/`watch` gated by `DISABLE_HMR` — do not touch (AI Studio editing mode).

## Quality Control

| Tool | Present | Config | Command |
|------|---------|--------|---------|
| ESLint | Yes | `eslint.config.js` (flat; typescript-eslint + react-hooks + react-refresh) | `npm.cmd run lint:eslint` |
| Prettier | No | — | — |
| TypeScript | Yes | `tsconfig.json` (`strict: true`, `noUnusedLocals`/`noUnusedParameters`, no `noUncheckedIndexedAccess`) | `npm.cmd run lint:tsc` |
| Vitest | Yes | no config file | `npm.cmd run test` |
| CI / Husky / lint-staged / Storybook | No | — | — |

Accepted ESLint warnings (don't block on them): `@typescript-eslint/no-explicit-any` at external boundaries (JSON parse, catch), `react-refresh/only-export-components` for files exporting shared helpers/constants.

## Environment

- Env vars: `GEMINI_API_KEY`, `APP_URL`, `TRUST_PROXY` (documents in `README.md`). Copy to `.env` / `.env.local`. App works without the key (fallback message in the AI modal). `.env*` gitignored.
- `config.ts` loads env via `import 'dotenv/config'` (reads `.env`), so it works regardless of import order.