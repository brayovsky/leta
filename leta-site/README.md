# Leta informational website

A simple, responsive Next.js website for Leta's pilot.

## Requirements

- Node.js 20.9+ recommended
- npm

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Build

```bash
npm run build
npm start
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
