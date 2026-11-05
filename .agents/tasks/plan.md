# Implementation Plan — MapTree auditoria e correção de defeitos (2 repositórios)

Trabalhar direto nos workspaces, SEM worktree e SEM commit (o usuário revisa diffs). Não fazer push.
Preservar funcionalidades existentes; corrigir um defeito não pode criar outro.

Repos:
- Frontend (FE): `/home/josewalter/Downloads/Maptree_frontend/MapTree_frontend`
- Backend (BE): `/home/josewalter/IdeaProjects/backend-maptree`

Baselines confirmados nesta investigação (verde):
- FE `npx vue-tsc --build` → OK. FE `npx nest build` (BE) → OK.
- BE specs de pruning/trees (4 arquivos) JÁ FALHAM no baseline (scaffolds sem dependências mockadas). Pré-existente.
- FE lint tem ~132 erros pré-existentes em arquivos não relacionados. Não corrigir em massa; não piorar.

Comandos reais de verificação:
- FE: `npm run type-check` (vue-tsc), `npx vitest run <path>`, `npm run build`, `npx eslint <arquivos alterados>`.
- BE: `npx nest build`, `npx jest <padrão>`.

---

## Parte 1 — BACKEND (correções firmes de contrato e segurança)

- [ ] 1. Remover `idUser` do `CreatePruningDto` (derivar do token).
      Manter `idTree`, `date`, `type`, `observations`. Remover o campo `idUser` e seus decoradores/imports órfãos (`@IsMongoId`/`@IsNotEmpty` continuam usados por `idTree`).
      Files: `/home/josewalter/IdeaProjects/backend-maptree/src/modules/pruning/dto/create-pruning.dto.ts`
      Verify: `cd /home/josewalter/IdeaProjects/backend-maptree && npx nest build` compila.

- [ ] 2. Ajustar `PruningService.create` para assinatura `(createPruningDto: CreatePruningDto, idUser: string)` e ADICIONAR o `await` faltante.
      Trocar `const pruning = this.prisma.pruning.create({ data: createPruningDto })` por
      `const pruning = await this.prisma.pruning.create({ data: { ...createPruningDto, idUser } })`.
      Manter a chamada `_recalculateTreeAfterPrune(createPruningDto.idTree)` e o `return pruning`.
      Files: `/home/josewalter/IdeaProjects/backend-maptree/src/modules/pruning/service/pruning.service.ts`
      Verify: `npx nest build` compila (o tipo `data` do Prisma aceita `idUser` + demais campos).

- [ ] 3. Proteger `PruningController` e injetar o usuário do token.
      Adicionar `@UseGuards(JwtAuthGuard)` no `@Controller('pruning')`. No `POST create`, injetar `@Req() req` e chamar `this.pruningService.create(createPruningDto, (req.user as JWTPayload).id)`.
      Imports: `UseGuards`, `Req` de `@nestjs/common`; `JwtAuthGuard` de `../../auth/guards/jwt.guard`; `JWTPayload` de `../../auth/interfaces/jwt-payload.interface`; `Request` de `express` (tipo do `@Req`). Seguir o padrão de `users.controller.ts` (que usa `express.Request` e `req.user`).
      Files: `/home/josewalter/IdeaProjects/backend-maptree/src/modules/pruning/controller/pruning.controller.ts`
      Verify: `npx nest build` compila. Nenhuma mudança em `pruning.module.ts` é necessária — o `JwtStrategy` é registrado globalmente via `AuthModule` (mesmo padrão de `users.module.ts`, que não importa AuthModule).

- [ ] 4. Tornar `age` opcional e aceitar `vigor` no `CreateTreeDto`; garantir transformação de data.
      - `age`: adicionar `@IsOptional()` e `@Type(() => Date)`, mudar para `age?: Date`, `@ApiProperty({ required: false, ... })`. (O `@Type` é necessário porque o FE envia string ISO e o `ValidationPipe({ transform: true })` precisa converter antes do `@IsDate`.)
      - `vigor`: adicionar `@ApiProperty({ required: false, enum: Vigor })`, `@IsEnum(Vigor)`, `@IsOptional()`, `vigor?: Vigor`.
      - `Vigor`: adicionar o enum `Vigor { EXCELLENT, GOOD, POOR, DEAD }` em `tree.entity.ts` (espelhando `prisma/schema.prisma`), seguindo o padrão do `TreeStatus` já local nesse arquivo, e importar de `../entities/tree.entity`. Importar `Type` de `class-transformer`.
      Files:
      `/home/josewalter/IdeaProjects/backend-maptree/src/modules/trees/dto/create-tree.dto.ts`,
      `/home/josewalter/IdeaProjects/backend-maptree/src/modules/trees/entities/tree.entity.ts`
      Verify: `npx nest build` compila. O spread `...createTreeDto` em `TreesService.create` repassa `vigor` ao Prisma (campo existe no schema).

- [ ] 5. Proteger `TreesController` inteiro com autenticação (leitura liberada a qualquer logado).
      Adicionar `@UseGuards(JwtAuthGuard)` no `@Controller('trees')`; importar `UseGuards` de `@nestjs/common` e `JwtAuthGuard` de `../../auth/guards/jwt.guard`.
      Files: `/home/josewalter/IdeaProjects/backend-maptree/src/modules/trees/controller/trees.controller.ts`
      Verify: `npx nest build` compila.

- [ ] 6. SEGURANÇA: remover o fallback hardcoded do segredo JWT sem quebrar ambientes com `JWT_SECRET`.
      - `jwt.strategy.ts`: ler `const secret = process.env.JWT_SECRET;` e `if (!secret) throw new Error('JWT_SECRET não configurada');` antes do `super({ ... secretOrKey: secret })`.
      - `auth.module.ts`: o `JwtModule.register` tem o MESMO fallback hardcoded; aplicar a mesma leitura/validação de `secret` (ou `JwtModule.registerAsync` lendo `process.env.JWT_SECRET`) para que assinatura e verificação usem o mesmo segredo. Remover ambos os literais `'fg025-...'`.
      - `.env.example` (BE) já documenta `JWT_SECRET`. Confirmar que `.env` local tem valor (confirmado: definido, 128 chars). Não versionar segredo real.
      Files:
      `/home/josewalter/IdeaProjects/backend-maptree/src/modules/auth/strategy/jwt.strategy.ts`,
      `/home/josewalter/IdeaProjects/backend-maptree/src/modules/auth/auth.module.ts`
      Verify: `npx nest build` compila; boot local continua porque `.env` tem `JWT_SECRET`. (Não derrubar/subir servidor de produção.)

- [ ] 7. Corrigir os specs de BE que já falham e cobrir as mudanças.
      Os 4 specs scaffold (`pruning.controller.spec.ts`, `pruning.service.spec.ts`, `trees.controller.spec.ts`, `trees.service.spec.ts`) falham por não mockar `PrismaService`/`HttpService`/`RegionService`/`SoilCorrelationService`. Reescrever com provedores mockados (`useValue`) e adicionar casos:
      - PruningController `create` chama `service.create(dto, 'user-id')` com `idUser` vindo de `req.user.id` (não do body).
      - PruningService `create` usa `prisma.pruning.create` com `{ ...dto, idUser }` e dá `await`.
      - TreesController protegido/`create` repassa `idSpecies`.
      Files: os 4 arquivos `*.spec.ts` acima.
      Verify: `npx jest pruning trees` passa (sai de 4 falhas para verde).

## Parte 2 — FRONTEND (formulários, mensagens, testes)

- [ ] 8. TS-07 — `TreeRegistrationPage.vue`: alinhar payload ao DTO e endurecer UX.
      - Renomear chaves do payload: `speciesId→idSpecies`, `lat→latitude`, `lng→longitude`. Manter `item-value="id"` no `v-select` (garante `idSpecies` = id real).
      - `age`: enviar SOMENTE quando preenchido, como ISO: `new Date(\`${form.age}-01-01\`).toISOString()`; quando vazio, OMITIR a chave (não enviar `undefined` explícito dentro de objeto literal — construir o payload condicionalmente).
      - `latitude`/`longitude` como `Number`. Manter `status` e `vigor`. Preservar `validate-on="submit"` e limites (-90..90, -180..180).
      - Sucesso só após resposta 2xx real (mensagem + limpar form); erro mostra mensagem PT-BR e NÃO declara sucesso.
      - Evitar duplo submit: botão já usa `:loading="loading"`; adicionar `:disabled="loading"` e garantir `loading=false` no `finally`.
      Files: `/home/josewalter/Downloads/Maptree_frontend/MapTree_frontend/src/pages/TreeRegistrationPage.vue`
      Verify: `npm run type-check`; testes do item 11 passam; `npm run build`.

- [ ] 9. TS-18 — `PruningRegistration.vue`: confirmar ausência de `idUser`, limpar payload e tratar sessão.
      - NÃO enviar `idUser` (já não envia). Remover `dateTree` do POST (o DTO do BE não aceita; `whitelist` descarta — remover para clareza) OU documentar que é ignorado; decisão: remover do corpo enviado.
      - `date` em `YYYY-MM-DD` já é aceito pelo `@Type(()=>Date)@IsDate` do BE; manter.
      - `observations` opcional (manter).
      - Dialog de sucesso só após resposta real (já faz). Erros nunca mostram sucesso.
      - Tratar 401/sessão expirada com mensagem clara PT-BR (distinguir de falha de validação/conexão). Evitar duplo submit (botão já tem `:loading`; manter desabilitado durante envio).
      Files: `/home/josewalter/Downloads/Maptree_frontend/MapTree_frontend/src/pages/PruningRegistration.vue`
      Verify: `npm run type-check`; testes do item 11 passam; `npm run build`.

- [ ] 10. Mensagens PT-BR e tratamento de erro consistente nos dois formulários.
      Criar um helper local (ou função por página) que mapeia erro Axios para mensagem PT-BR distinguindo: 400/422 validação ("Confira os dados..."), 401 sessão expirada ("Sua sessão expirou, entre novamente."), erro de rede/sem resposta ("Falha de conexão..."), e falha genérica ao salvar. Não vazar texto técnico em inglês do backend quando não for amigável. Sem dependências novas.
      Files: os dois `.vue` acima (e, se extrair helper, `src/utils/apiError.ts`).
      Verify: `npm run type-check`; testes cobrem pelo menos o mapeamento 401 vs 400.

- [ ] 11. Testes Vitest (item 14) para os formulários e guard de rota.
      Padrão: as páginas importam `{ apiConnect }` do módulo; usar `vi.mock('@/plugins/apiConnect', ...)` (diferente do `RegisterEmployee.spec.ts`, que injeta `$api`). Montar com `createVuetify` registrando os componentes usados; prover `routerKey`.
      Cobrir:
      - Árvore: payload usa `idSpecies`/`latitude`/`longitude`; `age` OMITIDO quando vazio; `age` em ISO quando preenchido; `latitude`/`longitude` numéricos; `idSpecies` = id selecionado.
      - Poda: payload NÃO contém `idUser`.
      - Coordenadas: regras de limite rejeitam valores fora de -90..90 / -180..180.
      - Guard de rota: `router/index.ts` redireciona USER para `/user` ao acessar rota com `meta.role` ADMIN/MANAGER (teste do `beforeEach` com store mockada).
      Files (novos):
      `src/pages/__tests__/TreeRegistrationPage.spec.ts`,
      `src/pages/__tests__/PruningRegistration.spec.ts`,
      `src/router/__tests__/roleGuard.spec.ts`
      Verify: `npx vitest run src/pages/__tests__ src/router/__tests__` — todos passam. Não criar testes supérfluos.

## Parte 3 — INVESTIGAÇÃO com decisão documentada

- [ ] 12. TS-10 / TS-04 / TS-16 — divergência de contadores no mapa.
      ACHADOS (em `src/components/functions/MapsView/PruningMap.vue`):
      - `treeCount` = `trees.value.length` → total CARREGADO em memória (depende do modo: nearby/bounds/city/tile), NÃO o total global do banco.
      - `visibleTreeCount` = árvores dentro do `bounds` atual do mapa → escopo VIEWPORT.
      - `cityStats.total`/`withRisk` (de `getCityStats`) → total GLOBAL por cidade no servidor (o painel "1000").
      - `criticalCount` usa `isTreeForPruning` (urgência "precisa de poda"); o filtro `activeFilter==='CRITICAL'` usa `item.urgency==='CRITICAL'`; `statusCounts.CRITICAL` usa `status==='CRITICAL'`. São TRÊS definições diferentes de "crítico".
      - Bug de rótulo: o chip "Pendentes"/"Precisa de poda" (linhas ~1981/2399) e o chip "Críticos" (linha ~1989) exibem AMBOS `criticalCount` → dois rótulos distintos mostram o mesmo número.
      DECISÃO (não forçar igualdade): os números representam ESCOPOS diferentes e devem ser rotulados claramente. (a) Rotular na UI: "Visíveis no mapa" (`visibleTreeCount`), "Carregadas" (`treeCount`), "Total na cidade" (`cityStats.total`). (b) Corrigir o chip "Críticos" para usar a contagem coerente com o filtro CRITICAL (urgency==='CRITICAL') em vez de `criticalCount`, e manter "Precisa de poda" com `criticalCount`. (c) Não introduzir contador "global do banco" onde só há dados carregados; usar `cityStats` quando a região estiver selecionada. Documentar a regra adotada em comentário no componente.
      Files: `src/components/functions/MapsView/PruningMap.vue`
      Verify: `npm run type-check`; `npm run build`; inspeção visual dos rótulos (sem E2E destrutivo contra produção).

- [ ] 13. TS-11 / TS-16 — sincronização de rotas diárias (`DailyRoutesPage.vue`).
      ACHADO (root cause firme, não ambíguo): `saveRoute()` faz `apiConnect.post('/scheduling', { plannedDate, type, status, treeIds, stops })`, mas o BE `CreateScheduleDto` exige `treeId` (singular, `@IsNotEmpty`) e NÃO define `treeIds`/`stops`/`status`. Com `ValidationPipe({ whitelist: true })`, esses campos são descartados e `treeId` fica ausente → o POST retorna 400 SEMPRE. Resultado: a rota nunca persiste no servidor; sempre cai na mensagem "local apenas". O snapshot local (`dailyRouteStorage.ts`) é salvo ANTES do POST.
      DECISÃO: o endpoint `/scheduling` modela UM agendamento por árvore; a rota é uma LISTA. Opção escolhida: no `saveRoute`, enviar um POST por parada —
      `await Promise.allSettled(routeStops.map(s => apiConnect.post('/scheduling', { treeId: s.id, type: 'PRUNING', plannedDate: new Date(\`${filters.date}T08:00:00\`).toISOString(), notes: \`Rota diária ordem ${s.order}\` })))`
      — e só declarar "confirmada no servidor" se TODOS tiverem sucesso; caso contrário, manter mensagem clara de "salvo neste dispositivo, pendente de sincronização" e permitir nova tentativa (o localStorage não duplica: usa chave por data; reenvio recria os agendamentos — aceitável por ser idempotente no nível de UI). Mostrar estado: local salvo vs confirmado no servidor vs pendente. Não apresentar dado local como persistido. Documentar a decisão em comentário.
      (Alternativa rejeitada: inventar endpoint batch no BE — fora do escopo deste passo e aumentaria blast radius.)
      Files: `src/pages/DailyRoutesPage.vue`
      Verify: `npm run type-check`; `npm run build`; teste unitário opcional do shape do payload por parada.

- [ ] 14. TS-12 — ano opcional da árvore. Coberto pelo item 8 + testes do item 11 (omitido/vazio/válido/limite 1900..ano atual). Sem arquivo extra.
      Verify: casos cobertos em `TreeRegistrationPage.spec.ts`.

- [ ] 15. TS-05 / TS-13 / TS-14 — fluxo de IA e upload.
      ACHADO: predição de IA é consumida via `apiConnect.getAiPrediction(treeId)` (GET `/trees/:id/ai-prediction`) em `PruningMap.vue`/`TreeAiStats.vue`. Importação CSV/externa existe (`importMapTreeCsv`/`importExternalData`) mas NÃO há UI de upload de arquivo pelo usuário final (os paths são fixos no BE). DECISÃO: preservar o fluxo existente; apenas endurecer estados de loading/erro/resposta inválida onde a predição é exibida (sem inventar fluxo de upload). TS-14 (upload) permanece "não executado" e TS-15 "não aplicável" — não há condição real de upload de arquivo pelo usuário. Documentar.
      Files: `src/components/functions/TreeAiStats.vue` (e trecho de IA em `PruningMap.vue`) apenas para tratamento de loading/erro, se houver lacuna.
      Verify: `npm run type-check`; inspeção dos estados de erro/carregando.

- [ ] 16. Segurança (item 10) — documentação e guard de rota.
      - Tokens em `localStorage` (risco XSS): DOCUMENTAR o risco e a recomendação (cookie HttpOnly) SEM migrar o mecanismo agora. Registrar em `.agents/tasks/security-notes.md`.
      - Confirmar que USER não acessa rotas ADMIN/MANAGER por URL direta: `router/index.ts` já redireciona por role (`beforeEach`). Validar e cobrir com teste (item 11, `roleGuard.spec.ts`).
      - Reforçar que a autorização real é no backend (os guards do BE adicionados nos itens 3 e 5 exigem autenticação; autorização por role fica a cargo de `RolesGuard` onde aplicável).
      Files (novo): `/home/josewalter/Downloads/Maptree_frontend/MapTree_frontend/.agents/tasks/security-notes.md`
      Verify: `roleGuard.spec.ts` passa.

- [ ] 17. UI/acessibilidade (itens 12/13) nos formulários tocados.
      Melhorar mensagens, estados loading/vazio/erro, foco de teclado e labels nos formulários alterados (Tree/Pruning), sem reformulação estética ampla. Garantir labels associados aos inputs e `aria` onde fizer sentido. Mensagens PT-BR.
      Files: `src/pages/TreeRegistrationPage.vue`, `src/pages/PruningRegistration.vue`
      Verify: `npm run type-check`; `npm run build`; inspeção de foco/labels.

## Verificação final de integração
- [ ] 18. BE: `cd /home/josewalter/IdeaProjects/backend-maptree && npx nest build && npx jest pruning trees` → verde.
- [ ] 19. FE: `npm run type-check && npx vitest run src/pages/__tests__ src/router/__tests__ && npm run build` → verde.
- [ ] 20. Lint direcionado só aos arquivos alterados (`npx eslint <arquivos>`); não aumentar a contagem de erros pré-existente (~132). Não rodar E2E destrutivo contra https://www.maptree.com.br.

## Lacunas/premissas
- O token JWT expõe `id` em `req.user` (JwtStrategy retorna o payload inteiro). Premissa: `req.user.id` é o id do usuário para a poda. Confirmado pelo contrato e por `users.controller.ts`.
- `TreesService.create` recebe `Omit<CreateTreeDto,'idSpecies'>` mas o controller passa o dto inteiro; comportamento pré-existente, fora de escopo (não quebra). Não alterar salvo se um teste revelar erro Prisma.
