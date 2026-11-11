# MapTree

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Homologar com o backend e MongoDB

Use dados descartáveis. Configure `VITE_API_BASE_URL` com a URL da API, incluindo `/api`, e inclua a origem exata do frontend em `CORS_ORIGIN` no backend.

```sh
npm ci
npm run test:unit -- --run
npm run build
npx playwright install chromium
npm run preview -- --host 127.0.0.1 --port 3500
```

Com o frontend e o backend em execução, defina `E2E_BASE_URL`, `E2E_API_URL`, `E2E_EMAIL` e `E2E_PASSWORD` com os endereços e uma conta de teste. Rode `npm run test:session`. Se necessário, `E2E_BROWSER_PATH` aponta para um Chromium instalado.

Para testar gravações, habilite `E2E_RUN_MUTATING_TESTS=1` somente em um banco descartável. Use uma conta `USER`, um inventário sem árvores críticas e duas espécies cadastradas no catálogo. Defina `E2E_FIRST_SPECIES` com o nome de uma espécie sem árvores e `E2E_SECOND_SPECIES` com o nome de outra espécie com exatamente duas árvores normais próximas de `-3.73191, -38.52671` (Fortaleza). O teste cadastra um usuário e uma árvore e grava a medição pela API. Recrie os dados antes de repetir o teste de gravação.

Antes de publicar, repita o login Google com o Client ID e uma conta da homologação. Valide o primeiro vínculo com a senha MapTree, um segundo login Google e o carregamento dos mapas com o provedor de mapas habilitado.

No Vercel, deixe `VITE_API_BASE_URL` vazio para o build usar `/api` no mesmo domínio. O rewrite encaminha a chamada para `https://api.maptree.com.br`. Confirme esse caminho em um preview HTTPS antes de promover o deploy.
