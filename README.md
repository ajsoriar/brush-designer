# brush-designer

A simple editor for creating and testing brushes in the browser.

## Demo

Use Node.js 22.13.0 or newer. The project includes `.nvmrc` and `.node-version` files pinned to 22.13.0.

If you use nvm on Windows, activate the project version before installing dependencies:

```sh
nvm list
nvm install 22.13.0
nvm use 22.13.0
```

Confirm the active version:

```sh
node --version
```

Install dependencies first:

```sh
npm install
```

Run the main app locally with Vite:

```sh
npm run dev
```

You can also open any file in [demo](./demo) in your browser to see individual component demos.

Generate a production build in `dist`:

```sh
npm run build
```

Preview the generated build:

```sh
npm run preview
```

![brush-designer example](./demo/Screen-Shot-1.png?raw=true "brush-designer example")

## License

[MIT](./LICENSE)
