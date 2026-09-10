# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --no-install web
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Custom Typst templates

The template uploader runs entirely in the browser. A custom `.typ` file must define the same `resume`, section-heading,
and `skills` helpers as the built-in template and contain this marker:

```typst
// ========== RESUME CONTENT ==========
```

The app replaces everything after the marker with the resume generated from the form, compiles the result with the
bundled Typst WASM compiler, and stores a valid template in `sessionStorage`. The upload dialog can download the current
built-in template as a compatible starting point.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
