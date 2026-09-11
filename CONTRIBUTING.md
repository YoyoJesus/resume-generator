# Contributing

Thanks for helping improve Resume Smith. Contributions involving document uploads, AI processing, or generated PDFs
deserve particular care because they affect user privacy, API cost, and document correctness.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Open an issue before a large feature, dependency change, or architectural change.
- Never include a real resume, personal information, API key, or `.env` file in an issue, fixture, screenshot, or commit.
- Use synthetic document fixtures in tests.

## Local setup

The SvelteKit application lives in `web/` and requires a current Node.js release.

```sh
cd web
npm install
npm run dev
```

Copy the documented environment variables into a local `.env` file when testing AI-backed routes. Do not commit it.

## Making changes

1. Fork the repository and create a focused branch from `main`.
2. Follow the architecture and privacy constraints in [AGENTS.md](AGENTS.md).
3. Keep browser code in `web/src/lib/` and server-only code in `web/src/lib/server/` or SvelteKit server routes.
4. Add tests for new behavior, input limits, and failure paths.
5. Update documentation when behavior, configuration, or user-visible limits change.

## Validation

Run these commands from `web/`:

```sh
npm test
npm run check
npm run lint
npm run build
```

If a platform-specific build step fails after Vite successfully compiles the client and server bundles, describe the
exact environment and failure in the pull request.

## Commit messages

Every commit must use a one-line [Conventional Commit](https://www.conventionalcommits.org/) message:

```text
type(optional-scope): imperative description
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`. Add `!` before the colon for a breaking change. Do not add a commit-message body or footer.

Examples:

```text
feat(upload): add PDF quality gate
fix: restore focus after closing dialog
docs!: replace the template contract
```

The pull-request workflow validates every commit in the PR. You can run the same check locally from the repository root, replacing `main` with the appropriate base ref when needed:

```sh
node .github/scripts/check-commit-messages.mjs main HEAD
```

## Pull requests

- Keep the change focused and explain the user-visible outcome.
- List the validation commands you ran and their results.
- Include screenshots or recordings for meaningful UI changes.
- Call out privacy, security, AI-cost, or Vercel deployment implications.
- Respond to review comments with either a fix or a concise technical explanation.

## AI agent attribution

Any issue or pull request prepared by an AI agent must end with this footer, filled with the actual values used. The harness is the agent application or coding environment, such as Codex, Claude Code, or Cursor.

```text
Agent provider: <provider>
Agent model: <model>
Agent harness: <harness>
```

Human-authored pull requests should retain `AI assistance: no` from the pull request template. Human-authored issues should enter `Not AI-generated` in the required attribution field. Repository automation validates either declaration and rejects partial or malformed AI footers.
