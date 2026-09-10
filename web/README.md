# Application workspace

This directory contains the deployable SvelteKit application for Resume Generator. See the [project README](../README.md) for features, privacy behavior, setup, template requirements, and Vercel deployment guidance.

Run all Node and npm commands from this directory:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` for local API-backed features. `OPENAI_API_KEY` enables resume extraction, AI tailoring, and DOCX template conversion; `ONET_API_KEY` enables O\*NET occupation search and details.

Useful commands are `npm test`, `npm run check`, `npm run lint`, and `npm run build`.
