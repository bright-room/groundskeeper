# Contributing

Thanks for taking the time to improve groundskeeper.

## Getting started

groundskeeper is a TypeScript pnpm monorepo. The Node.js and pnpm versions are pinned
in `mise.toml` (`mise install`). How to run it locally against a GitHub App is in
[docs/development.md](docs/development.md).

```bash
pnpm install
pnpm lint        # Biome: lint, format and import order (pnpm lint:fix to apply)
pnpm typecheck
pnpm test
```

Do not commit while any of these fails.

## Before you change code

Changes to `packages/` and `apps/` follow a design and an implementation plan:

- Designs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`

Both are written with the [superpowers](https://github.com/obra/superpowers) plugin for
Claude Code: its `brainstorming` skill produces the design and its `writing-plans` skill
the plan. You do not need the plugin to contribute — the documents are plain Markdown —
but new ones should follow the same format and locations.

Read the ones that cover your change first. If none does, open an issue to agree on
the design before writing code — a pull request that restructures packages without one
is closed.

`packages/core` must not depend on anything outside the Web standard APIs; GitHub,
Claude and other external services belong in `packages/adapters`.

## Pull requests

- CI runs on every pull request: `ci.yml` (lint, typecheck, test) and `security.yml`
  (hidden-content scan, gitleaks, dependency scanning, zizmor, actionlint). All of them
  must pass.
- Commits must be signed. `main` rejects unsigned commits.
- Pin any GitHub Action you add to a full commit SHA with a `# vX.Y.Z` comment. Renovate
  follows them.
- Commit messages use a `feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:` prefix.
- Link the issue the pull request resolves (`Closes #123`).
- Label the pull request so it lands in the right section of the release notes
  (`.github/release.yaml`):

  | Label                | Release notes section |
  | -------------------- | --------------------- |
  | `Impact: Breaking`   | Breaking Changes      |
  | `Kind: Feature`      | New Features          |
  | `Kind: Enhancement`  | Enhancement Updates   |
  | `Kind: Bug Fix`      | Bug Fix               |
  | `Kind: Dependencies` | dependency updates    |
  | anything else        | Other Changes         |

  `Meta: Release note ignored` keeps a pull request out of the notes.
- Review by the maintainers (`.github/CODEOWNERS`) is required before merge.

## Use of AI

AI assistance is fine. Submitting what an AI produced without understanding it is not.

Generating a submission takes seconds; verifying one takes a person's time. Sending
unverified output moves that cost onto the maintainers and takes time away from the review
this project actually needs.

Before you open an issue or a pull request, you are expected to have read the output,
verified it against this repository, and be able to explain and defend it. You are the
author of what you submit, whatever tool helped you write it.

Issues and pull requests that appear to be unreviewed AI output — invented options,
files or APIs that do not exist, a diff that does not follow from the description,
boilerplate that does not engage with this project — are **closed without notice and
without individual explanation**. That judgment is the maintainers', and there is no
appeal process; you are welcome to open a new issue or pull request that shows your own
reasoning.

Closing one does not mean the underlying point was worthless. If a closed issue or pull
request contains something useful, the maintainers may take it up — as an issue raised by
the maintainers, or by merging or rewriting the change — without notice and without credit
to the original submitter. Anything you submit is licensed under the
[MIT License](LICENSE), and opening an issue or pull request here means you accept this
handling.

## Reporting problems

- A security issue: see [SECURITY.md](SECURITY.md).
- A bug or a feature request: open an issue from the templates.

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE). Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
