# Dev client

A local stand-in for WhatsApp. It posts webhook-shaped messages (text and location) to the server and shows the assistant's replies, which it receives over Server-Sent Events from `/dev/stream`. Use it to work on the conversation flow without a Meta developer account.

```bash
yarn dev      # from the repo root: start the server on :3000
yarn dev:wa   # start this client on :5173
```

Pick one of the preset locations to set the delivery area, then chat. The presets match the stores in `server/src/db/seeds/stores.js`; "Karen" is intentionally out of service to test uncovered areas. Messages are sent from the fake number `254700000000`.

`/dev/stream` only accepts connections from localhost.
