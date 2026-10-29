# Playpen Software Website

The official Playpen Software website: a small static site introducing the company, its values, team, and product areas. The site is built from TypeScript and CSS and served as static files.

## Pages

- `index.html` — company overview, promises, team, and links.
- `studio/index.html` — Playpen Studio page.
- `devtools/index.html` — Development Tools page.

The Studio and Development Tools pages are currently starter pages.

## Requirements

- [Bun](https://bun.sh/) to build the site.
- [Node.js](https://nodejs.org/) and npm to run the local development server.

## Run locally

Install the Node dependencies and build the site:

```sh
npm install
bun build ./modules/index.ts --outdir ./dist --minify --target browser
```

Alternatively, run `build.bat` on Windows to build with Bun.

Start the local server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The server serves the project directory as static files. Rebuild the site after changing TypeScript or CSS source files.

## Project structure

```text
assets/       Images, icons, and fonts
devtools/     Development Tools page
modules/      TypeScript application modules
sheets/       CSS stylesheets
studio/       Playpen Studio page
index.html    Main website page
build.bat     Bun build command for Windows
test.js       Local static-file development server
```

## License

This project is licensed under the Apache License, Version 2.0. See [LICENSE.txt](LICENSE.txt).

*NOTE: This README was written by HydraFusion AI