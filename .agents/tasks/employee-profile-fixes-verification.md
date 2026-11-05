# Verificação de correções de perfil e cadastro

Data: execução desta tarefa

## Implementação

- `RegisterEmployee.vue` usa `cpfInput` e `phoneInput` como propriedades computadas graváveis. Atribuições vindas de digitação, colagem e edição são normalizadas e o valor controlado renderizado no input já contém a pontuação.
- CPF limita 11 dígitos numéricos e 14 caracteres mascarados.
- Telefone limita 11 dígitos numéricos, usa o formato progressivo e diferencia `(00) 0000-0000` de `(00) 00000-0000`.
- O payload de `POST /users` remove a pontuação imediatamente antes do envio.
- O botão de retorno do perfil foi agrupado com o chip de função, recebeu ícone, contraste, foco, área clicável e regras responsivas sem alterar `getHomeRouteByRole`.

## Comandos executados

- `npm run test:unit -- --run` — passou, 1 arquivo e 3 testes.
- `npm run type-check` — passou.
- `npm run build` — passou. O Vite apenas reportou o aviso já existente de chunks acima de 500 kB.
- `npx eslint src/components/GestorView/RegisterEmployee.vue src/components/GestorView/__tests__/RegisterEmployee.spec.ts src/components/MainView/EditProfileComponent.vue src/components/shared/PageHeader.vue vitest.config.ts src/shims-vue-router.d.ts` — passou.
- `npx prettier --check src/components/GestorView/RegisterEmployee.vue src/components/GestorView/__tests__/RegisterEmployee.spec.ts src/components/MainView/EditProfileComponent.vue src/components/shared/PageHeader.vue vitest.config.ts` — passou.
- `git diff --check` — passou.
- `npm run lint:check` — não passou por 132 erros preexistentes em outros arquivos do projeto; nenhum dos arquivos afetados aparece nos erros.
- `npm run format:check` — não passou porque há 48 arquivos preexistentes fora do escopo sem formatação; os arquivos afetados passam na verificação direcionada acima.

## Evidência executável de DOM e payload

O teste unitário monta o componente com Vuetify em `jsdom`, altera os inputs por `setValue` com dígitos, pontuação e caracteres inválidos, e verifica `input.value` no próprio DOM. Também verifica que o mock de `POST /users` recebe CPF e telefone somente com dígitos. O teste adicional executa o cancelamento e confirma o redirecionamento para `/manager/employees`.

## Evidência visual em navegador

O Chromium do Playwright não está disponível. A instalação com `npx playwright install chromium` foi tentada, mas os downloads do navegador expiraram. Como validação equivalente, o Firefox do sistema (`/usr/bin/firefox`) renderizou a rota pública `/edit-account` em modo headless:

- `curl -fsS -o /tmp/maptree-home.html -w '%{http_code}\\n' http://127.0.0.1:3500/edit-account` — retornou `200`.
- `firefox --headless --screenshot /tmp/maptree-edit-profile-desktop.png --window-size 1280,900 http://127.0.0.1:3500/edit-account` — gerou PNG `1280x900`.
- `firefox --headless --screenshot /tmp/maptree-edit-profile-mobile.png --window-size 390,844 http://127.0.0.1:3500/edit-account` — gerou PNG `390x844`.

A inspeção das imagens confirmou que, no desktop, o botão fica separado à direita do título/subtítulo dentro do hero verde, com ícone, contraste e área confortável. No mobile, o botão ocupa a largura disponível em uma linha própria e o chip de função fica abaixo, sem cobrir o título/subtítulo nem gerar overflow horizontal. A navegação continua no handler `goHome`, que chama `getHomeRouteByRole` e `router.push`; os testes do cadastro cobrem os redirects de salvar e cancelar.

O fluxo autenticado completo não foi executado porque não há sessão/API disponível neste ambiente. A rota de perfil pôde ser renderizada publicamente e a máscara/payload foram validados de forma executável no teste DOM.

Nenhum commit foi criado, conforme solicitado.
