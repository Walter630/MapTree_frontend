# Revisão — UI de cadastro de funcionário

## Escopo e evidências consultadas

Foram revisados o plano `employee-registration-ui-plan.md`, o registro de implementação/validação `employee-registration-ui-implementation.md`, o diff completo do commit `ad775f4` (`feat: modernize employee registration UI`), `src/components/GestorView/RegisterEmployee.vue`, `src/pages/TreeRegistrationPage.vue`, `src/assets/main.css`, `src/components/shared/PageHeader.vue`, a rota em `src/router/index.ts` e o chamador em `src/components/GestorView/ManagerEmployeesView.vue`. O diff efetivo altera somente `RegisterEmployee.vue`; não há alteração de dependências nem de outros fluxos.

O registro informa `npm run type-check` e `npm run build` aprovados, `npm run test:unit -- --run --passWithNoTests` aprovado sem arquivos de teste, e checks direcionados de ESLint/Prettier aprovados para o componente. Os checks globais de lint e formatação falharam em arquivos preexistentes fora do componente alterado, que não aparece entre os erros. O registro também informa que a inspeção Playwright não abriu a página porque não havia Chromium/Chrome instalado e o download do browser expirou; portanto, não há screenshots nem evidência DOM de execução.

## Verificação da implementação

- A tela usa `v-container.page-shell.py-8`, `PageHeader`, card centralizado, cabeçalho com avatar/ícone, divisor e formulário interno com `pa-6` em `src/components/GestorView/RegisterEmployee.vue:2-26`, correspondendo à estrutura de `TreeRegistrationPage.vue`. O card replica o limite de 980px, borda e raio em `RegisterEmployee.vue:189-193`; o fundo e os breakpoints vêm do `main.css` existente.
- Os cinco campos preservam os `v-model`s e regras em `RegisterEmployee.vue:30-97`. As colunas `cols="12" md="6"` empilham estruturalmente em viewport estreito, e as ações em `RegisterEmployee.vue:100-110` usam `flex-wrap`, botão salvar verde com submit e cancelar outlined.
- A lógica funcional permanece no mesmo componente: normalização de CPF/telefone, `POST /users` com `role: 'USER'` e `isActive: true`, redirect após status 201 em `RegisterEmployee.vue:155-168`, além de reset/cancelamento e redirect para `/manager/employees` em `RegisterEmployee.vue:176-183`. A rota continua protegida para `MANAGER` em `src/router/index.ts:95-105`, e o chamador continua navegando para ela em `ManagerEmployeesView.vue:336-338`.
- Não foi encontrado impacto óbvio de segurança, dados ou dependências novas. A inspeção estática não encontrou outro blocker de correção introduzido pelo diff. A responsividade prevista pelo CSS e pela estrutura é plausível, mas não foi comprovada em execução.

## Achados

### BLOCKER — Inspeção visual e funcional desktop/mobile obrigatória não concluída

- **Local:** evidência ausente para `src/components/GestorView/RegisterEmployee.vue:2-113`; requisito em `employee-registration-ui-plan.md` (etapa 4); limitação registrada em `employee-registration-ui-implementation.md:20-33`.
- **Evidência:** o registro descreve os cenários necessários — desktop `1280×900`, viewport estreito `390×844`, ausência de overflow, renderização do card/cabeçalho/divisor/cinco campos/ações, erro de e-mail, payload normalizado, redirect após salvar e navegação de cancelar — mas informa que o Playwright ficou bloqueado antes de abrir a página por falta do executável Chromium. Não foram produzidos screenshots ou evidência DOM.
- **Consequência:** não é possível confirmar o requisito visual solicitado em execução, especialmente que o card, campos e ações permanecem acessíveis sem overflow no viewport estreito, nem confirmar empiricamente os fluxos interativos de validação, salvamento e cancelamento. A ausência da verificação obrigatória bloqueia `APPROVED`, mesmo com compilação e checks direcionados aprovados.
- **Correção concreta:** executar a inspeção prevista em um ambiente com Chromium/Chrome disponível, ou fornecer evidência equivalente de execução, cobrindo desktop e viewport estreito, ausência de rolagem horizontal, elementos renderizados, e-mail inválido, normalização/API e os redirects de salvar/cancelar. Não é necessário alterar código de produção para este achado.

## Veredicto

`CHANGES_REQUESTED`: resta um blocker de gate pela ausência da evidência visual/funcional obrigatória. A implementação e a lógica preservada não apresentaram outro blocker conhecido; os failures globais de lint/format foram tratados como preexistentes e fora do escopo, com checks direcionados do arquivo aprovados.
