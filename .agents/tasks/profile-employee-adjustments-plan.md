# Implementation Plan

## Decisões e achados da exploração

- `src/components/MainView/EditProfileComponent.vue` mantém os campos editáveis em `form`, mas o card lateral `Resumo` lê diretamente `form.name` e `form.email`; por isso ele reflete cada tecla. A solução será manter um snapshot separado dos dados persistidos para o resumo e só substituí-lo depois de o `PUT /users/:id` concluir com sucesso.
- `currentUser` continuará vindo de `useAppStore()` para autenticação, papel e envio do identificador. O snapshot do resumo será inicializado após o carregamento remoto ou pelo fallback local já existente e não será alterado durante a digitação, cancelamento ou erro.
- A home por papel já é resolvida por `getHomeRouteByRole(router, role)`, usando as rotas com `meta.home` em `src/router/index.ts` (`/admin`, `/manager` e `/user`). O botão novo usará esse mesmo helper, sem criar rota paralela ou hardcode de um único papel.
- Não há utilitário de máscara próprio no código. Embora `AdminRegisterManagersView.vue` use atributos `mask`, o tipo instalado de `VTextField` não expõe essa prop; para garantir funcionamento durante digitação, colagem e edição, a implementação deve usar formatadores locais sem dependência nova. O payload continuará normalizando com apenas dígitos, como já faz `RegisterEmployee.vue`.
- Não foram encontrados testes unitários de aplicação. `e2e/vue.spec.ts` é o teste inicial genérico e espera `You did it!`, portanto não cobre estas telas; ele não deve ser alterado apenas por rotina.

# Implementation Plan

- [ ] 1. Separar o estado persistido do estado editável no resumo de `EditProfileComponent.vue`.
      Criar um snapshot reativo dos dados que o card lateral realmente exibe, incluindo nome, e-mail, organização e status, e usar esse snapshot no template em vez de `form`/do usuário que possa ser atualizado durante a edição. Centralizar a atualização do snapshot em uma função de preenchimento e chamá-la ao carregar dados válidos do endpoint ou ao usar o usuário local como fallback; não alterar o snapshot ao iniciar o salvamento, em exceções, nem no `finally`.
      Em `saveProfile`, preservar o payload e o `PUT` atuais; somente depois de uma resposta bem-sucedida calcular `updatedUser`, atualizar o store, preencher o formulário e substituir o snapshot pelos dados efetivamente persistidos. Se o endpoint não retornar `data`, usar a mesma combinação atual entre usuário salvo e payload, preservando organização/status existentes; se houver erro, manter o resumo anterior e apenas exibir a notificação já existente.
      Arquivos: `src/components/MainView/EditProfileComponent.vue`.
      Verify: `npm run type-check` — o componente Vue compila sem erros; durante a inspeção manual, editar nome/e-mail não muda o card `Resumo`, salvar com sucesso atualiza o card após a resposta e erro/cancelamento não publica valores não persistidos.

- [ ] 2. Adicionar uma ação explícita de volta à home usando o padrão de navegação existente.
      Em `EditProfileComponent.vue`, criar uma função de navegação para home que chame `getHomeRouteByRole(router, currentUser.value?.role)` e adicione no hero ou na área de ações um `v-btn` com ícone de casa e texto visível como “Voltar para a home”. Manter o botão `Cancelar` com o fluxo atual, os estados de `saving` e a responsividade; aplicar apenas estilos scoped necessários para o novo controle seguir a identidade visual desktop/mobile.
      Arquivos: `src/components/MainView/EditProfileComponent.vue`; referência: `src/components/MainView/AppBarComponent.vue`, `src/router/helpers/getHomeRoute.ts`, `src/router/index.ts`.
      Verify: `npm run build` — type-check e build de produção passam; com usuário ADMIN, MANAGER e USER, acionar o botão leva respectivamente a `/admin`, `/manager` e `/user`, sem alterar a rota `/edit-account` nem quebrar o cancelamento existente.

- [ ] 3. Implementar máscaras de CPF e telefone em `RegisterEmployee.vue` sem alterar o contrato da API.
      Substituir o `v-model` direto dos dois campos por bindings que passem cada novo valor por formatadores locais baseados em `onlyDigits`: CPF no padrão progressivo `000.000.000-00` limitado a 11 dígitos; telefone no padrão brasileiro progressivo, aceitando 10 dígitos (`(DD) 0000-0000`) ou 11 dígitos (`(DD) 90000-0000`) e limitando a entrada ao máximo correspondente. Os formatadores devem tratar string vazia, caracteres colados e remoção/edição sem lançar erro; manter os valores formatados apenas na apresentação do formulário.
      Preservar `rules.required`, `rules.contactFormat`, os demais campos e o comportamento do formulário. No método `registrar`, continuar construindo o payload a partir de `formData` e enviar `cpf` e `phone` por `replace(/\D/g, '')`, mantendo `role: 'USER'`, `isActive: true`, o endpoint `/users`, o redirecionamento e o tratamento de erro atuais; não enviar pontuação para a API e não adicionar dependências.
      Arquivos: `src/components/GestorView/RegisterEmployee.vue`; referências de normalização: `src/components/GestorView/ManagerEmployeesView.vue` e o próprio método `registrar` atual.
      Verify: `npm run type-check` e `npm run lint:check` — o binding Vue/TypeScript e os formatadores passam nas regras do projeto; manualmente, digitar e colar CPF/telefone mostra a pontuação progressiva, apagar/reeditar continua possível, a regra atual de contato continua aceitando o mínimo de 10 dígitos e uma submissão inspecionada envia somente dígitos.

- [ ] 4. Validar os fluxos completos e revisar o diff sem criar testes de rotina.
      Executar as validações documentadas pelo projeto: `npm run type-check`, `npm run build`, `npm run lint:check`, `npm run format:check` e `npm run test:unit -- --run --passWithNoTests`. Como não há suíte unitária aplicável, registrar essa ausência em vez de criar testes novos; não considerar o `e2e/vue.spec.ts` genérico como cobertura das mudanças.
      Fazer verificação visual/funcional com `npm run dev -- --host 127.0.0.1 --port 5173` se houver navegador disponível: em desktop e viewport estreito, confirmar que o novo botão não quebra o hero; no perfil, verificar edição sem atualização prematura do resumo, sucesso/erro/cancelamento do salvamento e retorno por papel; no cadastro, verificar máscara, colagem, edição, validação, payload sem pontuação e redirecionamento. Se o Chromium não estiver instalado ou não puder ser iniciado, registrar explicitamente essa limitação no relatório final, junto com as validações que passaram.
      Revisar `git diff -- src/components/MainView/EditProfileComponent.vue src/components/GestorView/RegisterEmployee.vue` e `git status --short`, garantindo que somente os arquivos necessários foram modificados, que nenhum arquivo de tarefa já existente foi sobrescrito e que não seja feito commit.
      Arquivos: `src/components/MainView/EditProfileComponent.vue`, `src/components/GestorView/RegisterEmployee.vue`; nenhum teste novo esperado.
      Verify: os comandos de type-check/build/lint/formatação/teste retornam sucesso conforme aplicável; a inspeção manual não encontra overflow ou regressão de navegação; o diff final contém apenas as alterações solicitadas.

## Riscos e critérios de aceitação

- Um `PUT` bem-sucedido sem corpo de resposta precisa atualizar o snapshot a partir da combinação já usada pelo componente, sem perder organização ou status. Uma resposta com erro, uma rejeição de rede ou o cancelamento devem deixar o snapshot anterior intacto.
- O formatter de telefone deve manter a regra atual de aceitar DDD + número com pelo menos 10 dígitos; ele não deve transformar o valor enviado em uma string com parênteses, espaços ou hífen.
- A máscara é somente apresentação e não é uma feature flag. No relatório final, explicar conceitualmente que feature flag é uma chave/configuração para ativar ou desativar uma funcionalidade gradualmente sem apagar o código; registrar que não foi adicionada porque estes ajustes são pequenos, permanentes e não exigem rollout condicional.
- Não alterar `src/router/index.ts`, `src/router/helpers/getHomeRoute.ts` ou `src/plugins/apiConnect.ts` salvo se a implementação encontrar uma incompatibilidade concreta, pois as rotas, o helper de home e os métodos HTTP atuais já cobrem o fluxo solicitado.
