# Contributing to Leta

Thanks for your interest in improving Leta. This guide explains how to set up the project, what we expect in a change, and how to get it merged.

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug.** Open an issue using the bug report template. Include steps to reproduce, what you expected and what happened.
- **Suggest a feature.** Open an issue using the feature request template and describe the problem before the solution.
- **Improve the docs.** Typos, unclear setup steps and missing explanations are all worth a PR.
- **Write code.** Look for issues labelled `good first issue` or `help wanted`. For anything larger than a small fix, open an issue first so we can agree on the approach before you put in the time.

Security problems should be reported privately; see [SECURITY.md](SECURITY.md).

## Development setup

Follow [Getting started](README.md#getting-started) in the README. In short:

```bash
yarn install
cp server/.env.example server/.env   # set MONGODB_URI and OPENAI_API_KEY
yarn seed                            # resets the database, use a dev DB
yarn dev                             # server
yarn dev:wa                          # local WhatsApp simulator
```

You don't need a WhatsApp Business account. The dev client (`dev-client/`) sends webhook-shaped messages to the server and shows replies, which covers most of the conversation flow.

Never commit `.env` files, API keys, access tokens, customer phone numbers or real order data. Use the seed data or made-up values in examples and tests.

## Making a change

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/checkout-total-rounding
   ```
2. Keep the change focused. One logical change per pull request is easier to review than several bundled together.
3. Match the style of the surrounding code (see below).
4. Run the checks for the workspaces you touched:
   ```bash
   yarn workspace @leta/portal lint
   yarn workspace @leta/portal build
   ```
5. Test the flow by hand. For server or agent changes, chat through the dev client and confirm the behaviour end to end. Mention what you tested in the PR.
6. Open a pull request against `main` and fill in the template.

### Changing the assistant

Changes to the system prompt or tool definitions in `server/src/services/agent.js` can shift behaviour in ways that are hard to spot. In your PR, include a few example conversations from before and after the change. Setting `LOG_LLM=true` writes the full LLM exchanges to `server/logs/`, which helps when debugging.

### Changing data models

If you change a Mongoose model in `server/src/db/models/`, update the seed data in `server/src/db/seeds/` to match, and describe in the PR whether existing data needs migrating. If you add or change an index, note that `yarn workspace @leta/server reindex` should be run.

## Code style

- **Server:** CommonJS (`require`), Express routers in `server/src/routes/`, business logic in `server/src/services/`. Configuration is read once in `server/src/config.js`; add new environment variables there and to `server/.env.example`.
- **Frontends:** React function components and hooks, ES modules, plain CSS. Put data fetching in `hooks/` and presentational pieces in `components/`.
- Each Vite app has an ESLint config; run `lint` before pushing.
- Prefer clear names and small functions over comments. Add a comment when the *why* isn't obvious from the code.

## Commit messages

Write commits in the imperative mood with a short summary line, for example:

```
Add store opening hours to location search
Fix checkout total when an item is removed
```

Add a body if the reason for the change isn't obvious from the summary.

## Pull request review

A maintainer will review your PR, usually within a few days. We may ask for changes; that's a normal part of the process. Once approved, a maintainer will merge it, usually with a squash merge.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
