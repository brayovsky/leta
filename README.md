# Leta

Leta is a proof of concept for quick, local deliveries over WhatsApp. A customer chats with a WhatsApp number, an LLM-powered assistant builds their shopping list from stores that serve their location, and they finish the order on a web checkout page. Operators manage orders in an admin portal, and human agents can step in to a conversation through an agent console.

> **Status:** early-stage POC. Expect rough edges and breaking changes.

## How it works

```
 Customer (WhatsApp)
        │
        ▼
 Meta WhatsApp Cloud API ──webhook──►  server  ◄──► MongoDB (stores, items, orders, users)
        ▲                               │  │
        └────────── replies ────────────┘  └──► OpenAI (shopping assistant + tool calls)
                                           │
              ┌──────────────┬─────────────┼───────────────┐
              ▼              ▼             ▼               ▼
          checkout        portal     agent-console     dev-client
       (customer pays) (admin orders) (human agents)  (local WhatsApp sim)
```

1. A customer messages the business number. Meta forwards the message to the server's webhook (`POST /`).
2. The server asks for a delivery location, then finds stores nearby with a MongoDB geospatial query.
3. The assistant (OpenAI, with `search_items` and related tools) turns free-text requests into order items, asking clarifying questions when needed. It can remember a customer's preferred variants.
4. When the customer is ready, they get a "Finish Shopping" link to the checkout app to review and place the order.
5. Staff see orders in the portal. Agents can switch a conversation to manual mode in the agent console and reply as the business.

## Repository layout

This is a Yarn workspaces monorepo.

| Workspace        | Package               | Stack                 | Dev port | Purpose                                                  |
| ---------------- | --------------------- | --------------------- | -------- | -------------------------------------------------------- |
| `server/`        | `@leta/server`        | Node, Express, Mongoose | 3000   | WhatsApp webhook, LLM agent, REST API                    |
| `dev-client/`    | `@leta/dev-client`    | React + Vite          | 5173     | Simulates WhatsApp locally, no Meta account needed       |
| `portal/`        | `@leta/portal`        | React + Vite          | 5174     | Admin portal: orders and users (Google sign-in)          |
| `checkout/`      | `@leta/checkout`      | React + Vite          | 5175     | Customer checkout page opened from the WhatsApp link     |
| `agent-console/` | `@leta/agent-console` | React + Vite          | 5176     | Human agents take over and reply to conversations        |
| `leta-site/`     | `@leta/leta-site`     | Next.js               | 3000*    | Public marketing site                                    |

\* `leta-site` uses Next's default port, so run it on another port (`yarn dev:site -p 3001`) if the server is running.

## Getting started

### Prerequisites

- Node.js 20 or newer
- Yarn 1 (classic)
- A MongoDB database (local `mongod`, Docker, or a free MongoDB Atlas cluster)
- An OpenAI API key

You do **not** need a WhatsApp Business account for local development; the dev client stands in for it.

### 1. Install

```bash
git clone https://github.com/<your-org>/leta.git
cd leta
yarn install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

At minimum, set `MONGODB_URI` and `OPENAI_API_KEY`. See [Environment variables](#environment-variables) for the rest.

### 3. Seed the database

```bash
yarn seed
```

This **deletes** all stores, items and orders in the target database and loads the sample data from `server/src/db/seeds/`. It asks for confirmation first. Point `MONGODB_URI` at a development database.

### 4. Run it

In separate terminals:

```bash
yarn dev          # server on http://localhost:3000
yarn dev:wa       # dev client on http://localhost:5173
```

Open the dev client, pick a preset location and start chatting. Replies stream back to the dev client over Server-Sent Events from `/dev/stream` (localhost only).

Other apps:

```bash
yarn dev:checkout # http://localhost:5175
yarn dev:portal   # http://localhost:5174
yarn dev:console  # http://localhost:5176
yarn dev:site     # Next.js marketing site
```

The Vite apps proxy their API paths to `localhost:3000`, so the server must be running.

## Environment variables

All server configuration lives in `server/.env` (see `server/.env.example` and `server/src/config.js`).

| Variable                 | Required for         | Description                                                                 |
| ------------------------ | -------------------- | --------------------------------------------------------------------------- |
| `PORT`                   |                      | Server port. Defaults to `3000`.                                            |
| `BASE_URL`               |                      | Public URL of the server.                                                   |
| `CHECKOUT_URL`           |                      | URL of the checkout app used in "Finish Shopping" links. Defaults to `http://localhost:5175`. |
| `MONGODB_URI`            | Everything           | MongoDB connection string.                                                  |
| `OPENAI_API_KEY`         | Everything           | Used by the shopping assistant.                                             |
| `USE_PREFERENCES`        |                      | Remember customers' preferred variants. Defaults to `true`.                 |
| `LOG_LLM`                |                      | Write LLM requests and responses to `server/logs/`. Defaults to `false`.    |
| `VERIFY_TOKEN`           | Real WhatsApp        | Token you choose when registering the webhook with Meta.                    |
| `WA_PHONE_NUMBER_ID`     | Real WhatsApp        | WhatsApp Cloud API phone number ID.                                         |
| `WA_BUSINESS_ACCOUNT_ID` | Real WhatsApp        | WhatsApp Business account ID.                                               |
| `WA_WHATSAPP_TOKEN`      | Real WhatsApp        | WhatsApp Cloud API access token.                                            |
| `WA_APP_SECRET`          | Real WhatsApp        | Meta app secret, used to verify webhook signatures. Required when `NODE_ENV=production`. |
| `GOOGLE_CLIENT_ID`       | Portal, console      | Google OAuth client ID used to verify sign-ins.                             |
| `ALLOWED_EMAILS`         | Portal               | Comma-separated emails allowed into the portal.                             |
| `ALLOWED_AGENT_EMAILS`   | Agent console        | Comma-separated emails allowed into the agent console.                      |
| `SESSION_SECRET`         | Portal, console      | Secret for signing session cookies. Use a long random string.               |

### Google sign-in

The portal and agent console use Google Identity Services. Create an OAuth client in Google Cloud Console and add `http://localhost:5174` and `http://localhost:5176` as authorized JavaScript origins. Then set its client ID as `GOOGLE_CLIENT_ID` in `server/.env` and as `VITE_GOOGLE_CLIENT_ID` in `portal/.env` and `agent-console/.env` (copy each `.env.example`).

### Marketing site

Set `NEXT_PUBLIC_WHATSAPP_NUMBER` (digits only, with country code) in `leta-site/.env` for the site's WhatsApp links. It is read at build time.

### Connecting real WhatsApp

1. Create an app in [Meta for Developers](https://developers.facebook.com/) with the WhatsApp product.
2. Expose your local server publicly (for example with `ngrok http 3000`).
3. Register the public URL as the webhook callback, using your `VERIFY_TOKEN`, and subscribe to `messages`.
4. Fill in the `WA_*` variables, including `WA_APP_SECRET` (App settings → Basic → App secret). Webhook POSTs without a valid `X-Hub-Signature-256` are rejected. If `WA_APP_SECRET` is unset, the check is skipped so the dev client works locally.

## Useful scripts

| Command                                 | What it does                                  |
| --------------------------------------- | --------------------------------------------- |
| `yarn dev`                              | Run the server with auto-reload (nodemon)     |
| `yarn start`                            | Run the server without auto-reload            |
| `yarn seed`                             | Reset and seed stores, items and orders       |
| `yarn workspace @leta/server reindex`   | Rebuild MongoDB indexes                        |
| `yarn workspace <package> lint`         | Lint a frontend workspace                     |
| `yarn workspace <package> build`        | Production build of a frontend workspace      |

## Deployment

The project's own deployment runs on Google Cloud: the server and marketing site deploy to Cloud Run through Cloud Build (`server/cloudbuild.yaml`, `leta-site/cloudbuild.yaml`), with Firebase Hosting in front (`firebase.json`, `cloudbuild.hosting.yaml`). The Cloud Build files use the build's own `$PROJECT_ID`. Set your Firebase project in `.firebaserc`.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

To report a security issue, see [SECURITY.md](SECURITY.md). Please don't open a public issue for it.

## License

[MIT](LICENSE)
