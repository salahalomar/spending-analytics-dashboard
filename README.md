# Personal Finance Dashboard

A dashboard for the whole of your money, not just what you spent: income, outgoings, what you owe,
and what you are owed — with everything you add saved in your own browser.

**[Live demo →](https://salahalomar.github.io/spending-analytics-dashboard/)**

![The dashboard in dark mode](docs/dashboard-dark.png)

<details>
<summary>Light theme</summary>

![The dashboard in light mode](docs/dashboard-light.png)

</details>

---

## What it does

Four sections, each with its own URL:

- **Overview** — money in, money out, whether you are ahead, both ledger balances, and a banner when
  anything is overdue in either direction.
- **Transactions** — every payment in a virtualised list, with a keyboard-first row for adding your
  own, and filters for direction, name, category, status, date range and amount.
- **Owed to me** — who has not paid you back, aged by how overdue it is.
- **I owe** — credit cards, loans and money borrowed, with the same ageing view.

Anything you type in is stored locally and survives a reload. Nothing is uploaded anywhere; there is
no backend.

## Built with

| Concern | Choice |
| --- | --- |
| UI | React 18 + TypeScript (strict) |
| State | Redux Toolkit + Reselect |
| Routing | React Router 7 |
| Storage | IndexedDB, with an in-memory fallback |
| Build | Vite 6 |
| Unit / integration tests | Jest + React Testing Library |
| End-to-end tests | Cypress |
| Quality | ESLint (type-aware) + Prettier, enforced in CI |

No charting library and no virtual-list library — both are implemented here, because those are the
interesting parts of the problem.

## The engineering worth looking at

**Only the visible rows exist.** [`useVirtualizer`](src/hooks/useVirtualizer.ts) renders the slice of
the list intersecting the viewport plus a small overscan, sizing the scroll container to the full
list height so the scrollbar stays honest. Scroll events are coalesced into an animation frame,
because a trackpad fires them far more often than the browser paints. The range arithmetic is a pure
exported function, so it is tested without a DOM. The footer shows the live DOM-node count, and the
header has a button that loads 50,000 rows so you can watch it stay flat.

**The search never touches every row.** There are a few dozen distinct counterparty names. The
search box [resolves the query against those](src/features/transactions/selectors.ts) and the row
filter does a `Set` membership test — orders of magnitude less work per keystroke than lower-casing
and scanning every string.

**Filters are split so a date slider doesn't redo everything.** `selectFilteredIgnoringDate` runs the
name, category, status and amount predicates; the date range layers on top. Moving a date re-runs one
comparison per row instead of all five — and the summary reuses the undated stage to compute the
previous-period comparison for free.

**The default sort is free.** Transactions arrive newest-first and every filter preserves that order,
so the default view returns the same array reference rather than copying and sorting.

**Merging your records with the sample is linear.** Both sides are already sorted newest-first, so
they are merged in one pass rather than concatenated and re-sorted.

**Money is integers.** Every amount is a positive count of pence, and `direction` carries the sign, so
a total never depends on remembering which way round a figure was stored. Rounding happens once, at
the formatting boundary.

**Status is derived, never stored.** A debt's `overdue` state is computed from its due date rather
than saved, so a record cannot sit in storage claiming a status that stopped being true. The
derivation takes the current time as an argument, which keeps it pure — and the pages read the clock
through [`useNow`](src/hooks/useNow.ts), via `useSyncExternalStore`, because calling `Date.now()`
during render is impure and lets two parts of the same screen disagree.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint across the project |
| `npm test` | Jest unit and integration tests |
| `npm run test:coverage` | The same, with a coverage report |
| `npm run cy:open` | Cypress in interactive mode |
| `npm run e2e` | Build-and-serve, then run Cypress headlessly |

## Testing

**292 Jest tests at ~96% statement coverage**, with the threshold enforced in
[`jest.config.cjs`](jest.config.cjs) so it cannot quietly rot, plus **10 Cypress journeys** against
the production build.

The suite is layered rather than uniform:

- *Pure logic* — the PRNG, the generator, the scale maths, the ageing buckets and the virtualiser's
  range calculation are tested directly as functions.
- *Persistence* — exercised against a real IndexedDB via `fake-indexeddb`, including that a record
  survives being read back through a fresh connection.
- *Reducers and selectors* — hand-checkable fixtures, including boundary days on date ranges and the
  previous-period comparison.
- *Components* — rendered against a **real store and a real router**, not mocks. The list is asserted
  to render ~20 rows for a 5,000-row dataset while still reporting the full count; the debounce is
  verified by dispatch count, so typing "tesco" must produce exactly one action.
- *Integration* — [`App.test.tsx`](src/App.test.tsx) drives the whole dashboard through the UI.

[`jest.setup.ts`](jest.setup.ts) supplies what jsdom lacks: element dimensions, `ResizeObserver`,
`PointerEvent`, `TextEncoder` and `structuredClone`. That last one mattered more than it sounds —
IndexedDB uses it to copy values on insertion, so without it every write threw and the store fell
back to memory, which would have let the persistence tests pass while testing nothing.

## Project structure

```
src/
├── app/            Store configuration and pre-typed hooks
├── components/     UI, grouped by area (charts, filters, ledger, transactions, …)
├── data/           Seeded PRNG and the sample generators
├── features/       Redux slices and the selector layer
├── hooks/          useVirtualizer, useElementSize, useDebouncedValue, useNow
├── pages/          Overview and transactions
├── services/       Local persistence
├── types/          Domain model
└── utils/          Formatting, dates, colours and chart scales
cypress/
├── e2e/            The end-to-end journeys
└── capture/        Regenerates the README screenshots
```

## Deployment

Set up for three hosts, none needing extra configuration:

- **GitHub Pages** — [`deploy.yml`](.github/workflows/deploy.yml) builds and publishes on every push
  to `main`, and enables Pages on the first run.
- **Vercel** — import the repository; [`vercel.json`](vercel.json) supplies the rest.
- **Netlify** — import the repository; [`netlify.toml`](netlify.toml) supplies the rest.

Pages serves a project repo from a subpath, so the deploy workflow passes `DEPLOY_BASE` to Vite and
the router reads `BASE_URL`. The build also copies `index.html` to `404.html`, which is how Pages
hands deep links back to a client-side router.

## Notes on the sample data

The sample is synthetic, generated at runtime from a fixed seed, and shaped to look like one person's
two years rather than uniform noise:

- salary lands on payday each month from a single baseline, rather than being drawn at random — which
  had produced a dozen pay packets some months and none in others
- rent, utilities, subscriptions, insurance and loan repayments are scheduled the same way
- everyday spending is weighted by how often each category actually happens, with amounts drawn from
  a per-category normal distribution and a clamped tail
- there are weekend, payday and inflation effects

It works out at roughly 3.5 card payments a day, with money in and money out within about 10% of each
other — a plausible picture rather than an impressive-looking one. The dataset is anchored to the
current date, so it never drifts into the past.

The 50,000-row stress dataset is one button away in the header. It is there to show the virtualised
list under load, not to suggest anyone spends that often.

## Licence

MIT
