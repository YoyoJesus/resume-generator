# Contributing

Thanks for helping improve Resume Generator. Contributions involving document uploads, AI processing, or generated PDFs
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

## Pull requests

- Keep the change focused and explain the user-visible outcome.
- List the validation commands you ran and their results.
- Include screenshots or recordings for meaningful UI changes.
- Call out privacy, security, AI-cost, or Vercel deployment implications.
- Respond to review comments with either a fix or a concise technical explanation.
