# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue, discussion or pull request for security problems.

Report vulnerabilities privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Include:

- what the issue is and where it is (file, route or app),
- steps to reproduce or a proof of concept,
- the impact you think it has.

We aim to acknowledge reports within 3 business days and will keep you updated as we work on a fix. Once it's resolved we're happy to credit you, unless you'd prefer to stay anonymous.

## Supported versions

Leta is an early-stage project. Only the latest commit on `main` receives security fixes.

## Scope

Areas we're especially interested in:

- the WhatsApp webhook and its verification,
- checkout links and order tokens,
- authentication and session handling for the portal and agent console,
- prompt injection that makes the assistant leak data or act outside its role.

If you're running your own deployment, keep `server/.env` out of version control, use a long random `SESSION_SECRET`, and restrict `ALLOWED_EMAILS` and `ALLOWED_AGENT_EMAILS` to people who need access.
