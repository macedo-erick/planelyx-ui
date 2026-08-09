# planelyx-ui

Web client for **Planelyx**, a personal financial tracking app: bank accounts, credit cards,
categorized debits/credits, recurring transactions, credit card installments, invoices with pay/unpay,
and a statement-import review queue. Built with Angular 22 (standalone components, signals), PrimeNG
on the Aura preset, Tailwind 4, Transloco for pt-BR/en-US, and Keycloak for authentication.

This is a client and does nothing on its own — it talks to [`planelyx-api`](../planelyx-api) for the
ledger, [`planelyx-ocr`](../planelyx-ocr) for statement imports, and Keycloak from
[`planelyx-auth`](../planelyx-auth) for sign-in. See [Prerequisites](#prerequisites).

## Stack

- Angular 22 with `@angular/build`, standalone components, signals, and lazy-loaded routes
- PrimeNG 22 with the [`@primeuix/themes`](https://primeng.org/theming) Aura preset and `primeicons`
- Tailwind 4 via `@tailwindcss/postcss`, plus `tailwindcss-primeui` so the utilities read PrimeNG's palette
- Transloco 8 for translations, with the locale, formatters and PrimeNG text moving together
- Chart.js 4 behind the dashboard
- `keycloak-angular` / `keycloak-js` for OAuth2/OIDC — the app never sees a password
- Vitest for unit tests, ESLint + Prettier for style
- Yarn 1.22, pinned by the `packageManager` field

## Prerequisites

- Node 22 — the version the `Dockerfile` and `.github/workflows/release.yml` build with
- Yarn 1.22
- [`planelyx-api`](../planelyx-api) checked out **beside this repo** and running. Its `compose.yaml`
  is the one that starts everything else: Postgres, Keycloak (built from
  [`planelyx-auth`](../planelyx-auth)) and the import service (built from
  [`planelyx-ocr`](../planelyx-ocr)). Follow that repo's README — `docker compose up -d` there plus
  `./gradlew bootRun` is the whole backend.

The three URLs this app expects locally, all of them defaults from the API's compose stack:

| Service | URL | Needed for |
| --- | --- | --- |
| `planelyx-api` | `http://localhost:8080/api` | everything except the import screens |
| Keycloak | `http://localhost:8081/auth` | signing in at all |
| `planelyx-ocr` | `http://localhost:8084/ocr` | `/ingest` and the document review screen |

**There is no seeded user.** Register through the app's login screen — the Keycloak realm has
registration enabled, and registering is also what provisions your default categories (the API's
README explains that hand-off). The realm password policy applies: at least 12 characters with an
uppercase letter, a lowercase letter, a digit and a special character.

## 1. Install

```bash
yarn install
```

## 2. Run the dev server

```bash
yarn start
```

The app is on `http://localhost:4200/` and reloads on save. Visiting it redirects to Keycloak; after
signing in you land on the dashboard.

**Keep the port.** The realm's `redirectUris` and `webOrigins` are scoped to a single origin — not
`*` — which defaults to `http://localhost:4200` and is set by `PLANELYX_UI_ORIGIN` /
`PLANELYX_UI_BASE_URL` on the Keycloak container. Serving this app on another port means Keycloak
refuses the redirect with an "Invalid parameter: redirect_uri" page rather than anything that points
at the port being the cause. If you need a different port, override those variables in the API's
compose environment (see [`planelyx-auth`](../planelyx-auth)) — and note the realm only reads them on
first import.

## Environments

There is no `.env` here. Configuration is three TypeScript files in `src/environments/`, all
satisfying the `Environment` interface in `environment.model.ts`, swapped at build time by
`fileReplacements` in `angular.json`:

| Configuration | File | API / OCR base URLs | Commands |
| --- | --- | --- | --- |
| `development` — default for `serve` | `environment.ts` | `localhost:8080/api`, `localhost:8084/ocr` | `yarn start`, `yarn watch` |
| `staging` | `environment.staging.ts` | `staging-api.planelyx.local/api`, `/ocr` | `yarn start:staging`, `yarn build:staging` |
| `production` — default for `build` | `environment.production.ts` | `planelyx.com/api`, `planelyx.com/ocr` | `yarn build`, `yarn start:production` |

Because the file is compiled into the bundle, **a build is environment-specific**: the Docker image
carries `environment.production.ts` inside it, so a staging deploy needs its own build rather than
different runtime environment variables. That is the reason `release.yml` builds one image per
target rather than parameterizing at boot.

Each file also carries `defaultCurrency` (`BRL`) and `defaultLocale` (`pt-BR`), which seed the
formatters and the initial language before any stored preference is read.

## Authentication

Configured in `src/app/core/auth/keycloak.providers.ts`, three decisions worth knowing:

- **`check-sso` with PKCE S256**, plus `withAutoRefreshToken` and a 30-minute inactivity logout. The
  app holds a token, never a credential.
- **The silent-SSO redirect resolves against `document.baseURI`**, not the bare origin. Production
  serves the SPA under `/ui/`, where `${origin}/silent-check-sso.html` is a 404 and the hidden iframe
  that refreshes the session silently stops working.
- **The bearer token is attached to exactly two hosts.** `apiUrl` and `ocrUrl` each get their own
  `createInterceptorCondition`, anchored with an escaped regex, so the access token cannot reach a
  third-party host the app might call later. `planelyx-ocr` needs its own entry rather than a
  widened pattern — it validates the same realm token and scopes documents by the `sub` inside it,
  so dropping that line makes the review screen fail with a 401 that reads like a broken login.

`authGuard` (`core/auth/auth.guard.ts`) protects every route under the `Shell`; only the 404 page
sits outside it.

## Internationalization

`LocaleService` (`core/i18n/locale.service.ts`) is the single place a language change is applied,
because four things have to move together or the page ends up half-translated:

1. Transloco's active language
2. the `Intl` locale behind every formatted amount and date
3. PrimeNG's own component text (`PRIMENG_TRANSLATIONS`)
4. `document.documentElement.lang`

Keeping them in one effect means adding a language later is one edit rather than four. The choice
persists under `planelyx.locale`.

Translations are plain JSON assets in `public/i18n/` — `pt-BR.json` and `en-US.json` — fetched by
`TranslationLoader`, with `en-US` as the fallback. Route titles are translation keys too:
`app.routes.ts` sets `title: 'titles.dashboard'`, and `TranslatedTitleStrategy` resolves it, which is
why the browser tab follows the language switch.

## Theming

`ThemeService` (`core/theme.service.ts`) toggles a single `app-dark` class on `<html>`, persists the
choice under `planelyx.theme`, and seeds it from `prefers-color-scheme` on first visit.

That class name appears in three places and they must agree:

- `darkModeSelector: '.app-dark'` in `providePrimeNG` (`app.config.ts`)
- `@custom-variant dark (&:where(.app-dark, .app-dark *))` in `src/styles.css`, which is what makes
  Tailwind's `dark:` variant follow the toggle instead of the OS
- `DARK_CLASS` in the service

`styles.css` also declares the cascade layer order — `theme, base, primeng, components, utilities` —
so Tailwind utilities win over PrimeNG component styles without `!important`.

## Data access

`CrudService<TModel, TRequest>` (`core/http/crud-service.ts`) is the shared shape for the three
resources with plain CRUD — bank accounts, categories, credit cards. Reads go through `httpResource`
so the list is a signal templates read directly; mutations use `HttpClient`, return Observables, and
refresh the list through an overridable `reload()` so a subclass holding a second resource can keep
it in step.

Transactions, templates, invoices and ingest deliberately **do not** extend it — they have filters,
no PUT, and operations like pay/unpay or confirm/rollback that the base class would only get in the
way of. They are written out explicitly instead; follow that when adding something similar rather
than widening the base.

`errorInterceptor` (`core/http/error.interceptor.ts`) turns a failed request into a translated toast
and rethrows so callers can still react. It skips 401 on purpose: auto-refresh already handles
expiry, and a toast on the way to a login redirect is just noise.

## Scripts

| Command | Does |
| --- | --- |
| `yarn start` | dev server on `:4200` |
| `yarn start:staging` / `yarn start:production` | dev server against the staging / production config |
| `yarn build` | production build into `dist/planelyx-ui/browser` |
| `yarn build:staging` | staging build (source maps on) |
| `yarn watch` | rebuild on change, development configuration |
| `yarn test` | unit tests |
| `yarn lint` | ESLint over `src/**/*.{ts,html}`, `--max-warnings=0` |
| `yarn lint:fix` | ESLint `--fix`, then Prettier `--write` |
| `yarn format` / `yarn format:check` | Prettier write / verify |

## Testing

```bash
yarn test
```

Vitest runs through the `@angular/build:unit-test` builder, so there is no separate Karma or Vitest
config to maintain. Specs live beside the code they cover (`transaction-form-dialog.spec.ts`,
`money.spec.ts`, and so on).

`src/testing/transloco.ts` exports `provideTestingTransloco()`, which wires Transloco into a
`TestBed` using the **real** `en-US.json` rather than stubs. That is deliberate: a test asserting on
a label then fails when its translation key is renamed or dropped, which is the failure worth
catching. Both languages point at the same file so no test depends on which one is active.

There is no end-to-end suite — `angular.json` defines no `e2e` target.

## Linting and formatting

ESLint covers TypeScript and Angular HTML templates (`typescript-eslint` + `angular-eslint`) and runs
with `--max-warnings=0`; Prettier owns formatting.

```bash
yarn lint       # check
yarn lint:fix   # fix lint + format
```

In CI both steps still run with `continue-on-error: true` in `.github/workflows/release.yml`. That
was a concession to a backlog of pre-existing errors on master — a release gate that is red on
arrival only teaches people to ignore it. Both commands now pass clean on master, so the flags have
outlived their reason and can be dropped.

`AGENTS.md` at the repo root is the style guide the code follows and new code should too: standalone
components, signals for state, `input()`/`output()`/`model()` over decorators, `computed()` for
derived state, native `@if`/`@for` control flow, `class`/`style` bindings rather than
`ngClass`/`ngStyle`, `inject()` over constructor injection, `@Service` for new singletons, and Signal
Forms for new forms. Accessibility is part of it — WCAG AA minimums, and it must pass AXE.

## Docker

The `Dockerfile` is two stages: a Node 22 build, then nginx 1.27 serving the output.

```bash
docker build -t planelyx-ui:latest .
docker run --rm -p 8080:8080 planelyx-ui:latest   # http://localhost:8080/ui/
```

The build passes `--base-href /ui/`, which rewrites `<base href>` in `index.html`. The auth code
reads that back at runtime through `document.baseURI`, so the Keycloak redirect and silent-SSO URIs
follow the base path automatically instead of needing a second setting.

`docker/nginx.conf` owns the `/ui/` prefix end to end — the host nginx forwards it verbatim, so
nothing is rewritten. Three rules matter:

- `index.html` is `no-store`. It names the hashed bundles, so caching it would pin clients to a
  previous deploy's assets.
- Files matching `-<8 chars>.<ext>` (what `outputHashing: all` produces) are `immutable` for a year.
  Matching exactly eight characters keeps unhashed assets copied from `public/` out of that bucket.
- Everything else under `/ui/` falls back to `index.html`, which also covers
  `silent-check-sso.html`.

`/healthz` answers `ok` for the container health check.

## Release and deployment

`.github/workflows/release.yml` runs on pushes to `master` and on `v*` tags: install, lint, format
check, test, then build the image and push it to GCP Artifact Registry
(`southamerica-east1-docker.pkg.dev/.../planelyx/ui`) tagged with the commit SHA and `latest`.

The workflow only builds and pushes. Deployment lives in [`planelyx-infra`](../planelyx-infra) —
`DEPLOYMENT.md` there is the runbook, and `compose.prod.yaml` is what pulls the tag onto the VPS
behind the host nginx.

## Project structure

```
core/auth/       Keycloak providers, bearer-token conditions, route guard
core/http/       CrudService base, error interceptor, API error normalization
core/i18n/       LocaleService, translation loader, PrimeNG text, translated route titles
core/            ThemeService
layout/          Shell (sidebar + topbar) and the nav item list
features/        one folder per route, each with its page, dialogs and service
shared/controls/ form-control wrappers over PrimeNG inputs (text, number, money, date, select, …)
shared/models/   wire contracts — planelyx-api's, and planelyx-ocr's separately
shared/ui/       card, page header, empty state, month nav, transaction row, category badge
shared/util/     money, dates, locale, enum labels, http params
environments/    per-configuration constants, swapped at build time
testing/         TestBed helpers
```

Every page in `features/` is lazy-loaded from `app.routes.ts` — dashboard, transactions, ingest (plus
`ingest/:id` for document review), invoices, accounts, cards, categories, profile.

`shared/models/ingest.ts` is worth reading before touching the import screens. `planelyx-ocr` speaks
a different dialect of money from `planelyx-api`: integer minor units rather than decimals, because
its safety story rests on reconciling every extracted line against the total the issuer printed, and
that addition has to be exact. Nothing in that file is a `Money`.

The sidebar order in `layout/nav-items.ts` is not alphabetical or arbitrary — it follows the order
money is set up in rather than reviewed in, so the accounts and cards a transaction needs come before
the transactions themselves.
