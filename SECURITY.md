# Security Policy

## Supported versions

groundskeeper has no releases yet. Only the latest commit on `main` is supported.

## Reporting a vulnerability

Report privately through GitHub: open the **Security** tab of this repository and
choose **Report a vulnerability**. Please do not open a public issue.

Include the commit you ran (`git rev-parse HEAD`), how you ran it (`pnpm dev` or
otherwise), and the steps, webhook payload or issue/comment content that reproduce
the problem. Remove any key, secret or token before sending.

## What counts as a security issue

- **A secret leaking.** The GitHub App private key, the webhook secret, the Anthropic
  API key or an AI Gateway token appearing in a log, an issue, a comment, a label, or
  anywhere else groundskeeper writes.
- **A forged webhook being processed.** A request without a valid
  `X-Hub-Signature-256` that groundskeeper acts on.
- **Content steering groundskeeper.** Text in an issue or comment that makes
  groundskeeper act outside what it is built to do: touching another repository,
  exposing its configuration or secrets, or taking an action the content's author could
  not take themselves.

Not a security issue:

- A wrong judgment, such as an unexpected label or a missed duplicate, without the
  effects above. Open an ordinary issue.
- Something a person can already do with their own permissions on the repository.

## Handling

Reports are acknowledged and triaged by the maintainers. Once a fix is merged, the
advisory is published with credit to the reporter unless anonymity is requested.
