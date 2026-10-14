# Leta informational website

A simple, responsive Next.js website for Leta's pilot.

## Requirements

- Node.js 20.9+ recommended
- Yarn 1 (this is a workspace of the Leta monorepo)

## Run locally

From the repo root:

```bash
yarn install
yarn dev:site
```

Then open http://localhost:3000. If the Leta server is already using port 3000, run `yarn dev:site -p 3001` instead.

## Build

```bash
yarn workspace @leta/leta-site build
yarn workspace @leta/leta-site start
```

## Customize

Main page content:
- `app/page.tsx`

Global styling:
- `app/globals.css`

Site metadata:
- `app/layout.tsx`

The WhatsApp number is configured at the top of `app/page.tsx`.

The site is intentionally informational. WhatsApp is the customer action; there is no ordering backend or database.
