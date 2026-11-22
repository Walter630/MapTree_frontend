# SDD — Editor da landing e segurança de rotas

## Estado e revisão observada

Implementação local em andamento em 20/11/2026. A revisão de referência do frontend é `97394f4` (`main`), com alterações locais preexistentes. O backend indicado pelo usuário é `/home/josewalter/.codex/worktrees/maptree-painel-funcionario/backend-maptree`, revisão `12aeab3`, também com alterações locais preexistentes. Esses snapshots ainda não identificam uma revisão homologada ou publicada.

O inventário atual está em [inventario-rotas-seguranca.md](inventario-rotas-seguranca.md). Ele foi levantado dos controllers registrados no backend disponível, do Vue Router, de `main.ts` e de `vercel.json`. O arquivo `docs/route-pruning-security.md` descreve um estado anterior e precisa ser reconciliado antes de servir como evidência de release.

## Objetivo

Permitir que ADMIN edite a landing pública completa pelo painel, com rascunho, prévia, publicação, histórico e restauração. Rever todas as páginas, operações da API, domínios, redirects e entregas de arquivo para impedir exposição, acesso cruzado entre organizações e alterações sem autorização.

## Regras de acesso

- O servidor é a autoridade para autenticação, papel, organização, propriedade e campos graváveis. O Vue Router serve apenas para navegação e experiência.
- Operações da API são privadas por padrão. Só ficam públicas as operações listadas explicitamente no inventário e a leitura de conteúdo e mídia publicados da landing.
- ADMIN pode administrar recursos globais e regularizar vínculos legados por operações administrativas explícitas.
- MANAGER atua somente na organização ativa vinculada à sessão. USER atua nos registros da própria organização e nas árvores que criou, conforme a operação.
- Conta sem organização e árvore sem organização não recebem acesso amplo como fallback. Recursos sem vínculo ficam inacessíveis a MANAGER/USER até regularização auditável por ADMIN.
- Escritas não aceitam `role`, autoria, organização, proprietário ou estado protegido do payload quando esses valores devem vir da identidade autenticada.
- Recursos de outra organização retornam `404` para identificadores diretos quando a rota precisa evitar enumeração; proibições de ação por papel retornam `403`. Uma rota que use outra convenção deve documentá-la e testá-la.
- Respostas, relatórios, CSV, erros e logs retornam apenas os campos necessários e autorizados. Hashes de senha, tokens, cookies e segredos nunca são serializados.
- Cache público contém somente a revisão publicada. Respostas do painel, rascunho, prévia e mídia ainda não publicada usam `private, no-store`.

## Rotas web

| Área | Caminhos | Regra esperada |
|---|---|---|
| Landing e páginas públicas | `/`, `/login`, `/cadastro`, `/recovery`; aliases `/register`, `/recovery-code`, `/reset-password`; página de erro `/:pathMatch(.*)*` | Acesso anônimo. Os aliases mantêm destinos definidos. A landing não carrega dados operacionais privados. |
| Solicitação de gestor | `/cadastro/solicitacao` | Sessão USER com solicitação própria; demais perfis são encaminhados conforme a regra de navegação. A API retorna somente a solicitação do ator. |
| Sessão e perfil | `/logout`, `/edit-account` | Sessão válida; leitura e gravação limitadas ao perfil próprio, salvo operação administrativa explícita. |
| Administração existente | `/nova-pagina`, `/dashboard-previews`, `/admin/**` | ADMIN. As APIs chamadas por essas telas repetem a autorização no servidor. |
| Novo editor da landing | `/admin/landing` e telas filhas | ADMIN. Nenhum gestor, funcionário ou visitante lê ou grava rascunho, prévia, histórico privado ou mídia de rascunho. |
| Gestão | `/manager/**` | MANAGER vinculado à organização ativa. Rotas filhas herdam o papel, mas cada API também valida escopo. |
| Campo | `/user/**` | USER vinculado à organização ativa. Rotas filhas herdam o papel, mas cada API valida autoria e escopo quando aplicável. |

Em produção, `vercel.json` envia o domínio público para a aplicação em caminhos diferentes de `/`, envia `app.maptree.com.br/` para `/login` e encaminha `/api/*` ao backend. A landing pública fica em `maptree.com.br/`. Essas regras precisam ser verificadas em homologação junto com CORS, cookies, cache e a origem de cada sessão.

## Contrato editorial

### Conteúdo e renderização

- Cada seção tem `id` estável, `type` tipado, posição, estado visível e campos permitidos para aquele tipo. O conteúdo antigo inicia a revisão 1.
- As seções atuais são: cabeçalho, abertura, propósito, demonstração do produto, como funciona, funcionalidades, público, apresentação, evolução analítica, perguntas frequentes, chamada final e rodapé.
- Textos, títulos, textos alternativos, rótulos, imagens e links editáveis passam por DTOs e validação no servidor. Os destinos de Entrar e Solicitar acesso continuam ligados aos destinos oficiais da aplicação.
- A página e a prévia usam o mesmo renderizador e os mesmos componentes de demonstração. As demonstrações permanecem fictícias e locais.
- Reordenação e ocultação usam IDs de seção estáveis. Antes de salvar, validar que âncoras de navegação visíveis continuam apontando para uma seção visível. Corrigir o ID duplicado `sobre` observado no markup atual.
- Renderizar texto como texto. Não aceitar HTML livre. Links aceitam apenas âncoras, caminhos internos permitidos e HTTPS; rejeitar `javascript:`, `data:`, `file:` e protocolos não previstos.

### Revisões e API proposta

- `GET /api/landing/published`: conteúdo publicado sem exigir credenciais; pode usar cache público versionado.
- `GET /api/admin/landing/draft`: ADMIN lê rascunho, versão, horário da última edição e ID do autor salvo pelo servidor.
- `PUT /api/admin/landing/draft`: ADMIN salva com `expectedVersion`; conflito retorna `409` e o editor mantém as alterações locais.
- `GET /api/admin/landing/preview`: ADMIN recebe a mesma revisão tipada usada pelo renderizador público.
- `POST /api/admin/landing/media`: ADMIN envia arquivo multipart; a API valida assinatura real, tamanho, dimensões e formato aceito. O ativo ainda não publicado permanece privado.
- `GET /api/admin/landing/media/:id`: ADMIN lê bytes por ID com `private, no-store`; nenhum ativo de rascunho fica acessível anonimamente até ser referenciado por publicação.
- `GET /api/landing/media/:id`: somente mídia referenciada por revisão publicada pode ser lida anonimamente.
- `GET /api/admin/landing/revisions`: ADMIN consulta versões, autor, data e ação.
- `POST /api/admin/landing/publish`: ADMIN publica com `expectedVersion` e chave de idempotência.
- `POST /api/admin/landing/revisions/:id/restore`: ADMIN cria uma nova ação de restauração para uma revisão existente; não apaga o histórico.

O contrato está implementado nos checkouts locais. DTOs, status HTTP, validação, cache e repetição estão definidos no código; persistência, limites de upload e troca de revisão ainda precisam de validação em Mongo descartável e homologação. A publicação troca o apontador público na transação depois de validar o conteúdo e os ativos. Ativos são imutáveis por revisão; a chave de idempotência evita publicação duplicada.

### Mídia

O backend já usa MongoDB via Prisma 6.19.3. Cada arquivo validado é guardado em um documento `LandingAsset`, usando `Bytes` (mapeado pelo conector para `binData`) e metadados separados da revisão; o estado do rascunho inclui versão, horário e ID do último autor. O limite inicial é 8 MiB por arquivo, abaixo do limite de 16 MiB por documento BSON; uploads maiores são recusados. A referência do Prisma confirma o mapeamento [`Bytes` → `binData`](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb); o [manual do MongoDB](https://www.mongodb.com/docs/manual/reference/limits/) documenta o máximo de 16 MiB por documento.

Não usar `public/` do frontend para rascunhos. A API lê bytes privados somente para ADMIN e entrega anonimamente apenas ativos referenciados por uma revisão publicada. Validar assinatura real PNG/JPEG/WebP, tamanho, dimensões e hash; rejeitar SVG e HTML. Manter ativos imutáveis e limpar somente os não referenciados por rascunho ou revisão após a janela de retenção. Confirmar o limite de upload do Nest/Express e os headers de cache no teste de integração.

## Superfície da API e estado da segurança

- `src/main.ts` registra `JwtAuthGuard` e `RolesGuard` globalmente no `AppModule`, além do prefixo `/api`. A API pública é exceção explícita, não a ausência de verificação no frontend.
- No snapshot local do backend há 110 operações em 16 controllers, das quais 11 são públicas explícitas. O módulo editorial adiciona dez operações: duas públicas para conteúdo/mídia publicados e oito ADMIN para rascunho, prévia, upload, histórico, publicação e restauração. A SDD anterior informava que o inventário de árvores era compartilhado; o código local atual adiciona `organizationId`, escopo por organização e reconciliação administrativa de árvores sem vínculo. Essa mudança ainda precisa de verificação de integração e alinhamento da documentação antiga.
- `treeScope` falha fechado para atores sem organização; `editableTreeScope` restringe USER ao autor; históricos, poda, medição, mapa, busca, estatísticas e exportação devem aplicar o escopo também às relações e agregações.
- O teste de proteção anterior enumerava controllers manualmente e não incluía dashboard nem controllers de solicitação de gestor. O teste agora descobre controllers pela árvore de módulos do `AppModule`, compara a lista de rotas públicas e verifica recusa por papel em todas as operações que declaram `@Roles`.
- O Jest completo do backend passou com 343 testes em 27 suítes; os testes focados em agendamento e papéis passaram com 225 casos em três suítes. O build NestJS passou. ESLint passou no controller de espécies, mas o lint do arquivo de agenda segue falhando por problemas preexistentes de formatação e tipagem fora da alteração; as novas linhas do teste de regressão foram verificadas separadamente. O frontend passou com 182 testes em 38 arquivos, `type-check`, `lint:check` e build; após a última alteração, o teste da página de cadastro passou com 29 casos. Isso não substitui cenários A/B com Mongo descartável, navegador ou configuração de domínio.
- Rotas operacionais sem `@Roles` continuam permitidas a qualquer sessão autenticada no guard global; nesse caso, a decisão de papel, organização e propriedade precisa existir no serviço e estar coberta por teste específico.
- Criação, atualização e remoção do catálogo global de espécies agora são ADMIN-only. Na tela de cadastro, os demais perfis recebem orientação para solicitar a inclusão ao administrador.

### Achados estáticos e pendências de segurança

A revisão estática do backend `12aeab3`, scan `57838934-0210-40f7-916e-d6be2d4ea163`, e uma leitura independente encontraram quatro problemas distintos. A revisão não acessou segredos, MongoDB, navegador, serviço de e-mail ou configuração de produção.

- **Corrigido localmente — rota diária:** a consulta que reordena paradas agora aplica `treeScope(actor)`. Um teste de serviço garante que a consulta de gravação filtre pela organização.
- **Corrigido localmente — catálogo global:** `POST` e `PATCH /api/species` agora exigem ADMIN; a remoção já tinha essa regra. O cadastro rápido fica disponível apenas a ADMIN na tela de árvores. O inventário de rotas foi atualizado.
- **Pendente — solicitação pública de gestor:** cada submissão com identidade nova cria registros e notificações para administradores sem limite de volume no código. A proteção do proxy/ingress de produção não foi verificada; a liberação depende de limite durável de entrada ou controle equivalente.
- **Pendente — prova de e-mail:** a solicitação pública cria uma conta ativa com e-mail único antes de confirmar sua posse; login não exige `emailVerifiedAt`. Corrigir isso exige criar a conta somente depois da confirmação e permitir que o solicitante defina a credencial após provar o e-mail.
- **Política pendente — logout:** o endpoint limpa o cookie no navegador, mas não revoga no servidor um refresh token já copiado. Definir a revogação desejada para logout e troca de senha antes dos testes T09.

O relatório estático registrou duplicada a ocorrência de reordenação de rota; a contagem acima considera os quatro problemas distintos. A revisão é anterior às duas correções locais e não certifica o código após elas.

## Critérios de aceite e verificação

| ID | Cenário | Aceite | Evidência prevista | Estado |
|---|---|---|---|---|
| T01 | Inventário completo | Toda rota Vue, operação API, redirect, documentação e entrega auxiliar tem regra e teste associado. | Comparação do inventário com módulos registrados, router e configuração de domínios. | Inventário local das 110 operações concluído; rotas registradas em teste HTTP; homologação pendente |
| T02 | Acesso anônimo e ciclo de sessão | Público segue contrato; privado retorna `401`; sessão expirada e encerrada não exibe conteúdo privado. | Teste HTTP e navegador com sessão anônima, válida, expirada e encerrada. | Parcial: teste HTTP cobre 401 em rotas privadas; navegação e ciclo real de sessão pendentes |
| T03 | Papéis e propriedade | Cada papel executa apenas operações e recursos permitidos; negações não persistem alterações. | Testes HTTP e de serviço por papel e autor. | Parcial: teste HTTP percorre papéis declarados; mutações de espécies restritas a ADMIN; propriedade em homologação pendente |
| T04 | Isolamento A/B | Listas, detalhes, buscas, contagens, mapas, históricos e gravações não cruzam organizações. Sem vínculo, falha fechado. | Mongo descartável com organizações e sessões A/B; comparar respostas e persistência. | Parcial: teste cobre filtro organizacional na reordenação diária; cenários A/B em Mongo descartável pendentes |
| T05 | Campos e exportações | Respostas, relatórios e arquivos não contêm credenciais, campos indevidos ou dados de outra organização. | Comparação de campos e registros sintéticos por papel. | Pendente |
| T06 | Entrada inválida e campos protegidos | DTO rejeita formato, limite, ID e campo extra indevidos; autoria, organização e papel vêm da sessão. | Testes de DTO/controller e conferência da persistência. | Parcial: testes editoriais rejeitam formato/link inválido e upload com assinatura inválida; auditoria completa pendente |
| T07 | Falha, repetição e concorrência | Operações críticas são atômicas ou recuperáveis; idempotência evita duplicatas; conflitos não sobrescrevem silenciosamente. | Testes de integração com falha e concorrência em banco descartável. | Parcial: testes de serviço cobrem CAS, transação, publicação idempotente e restauração; concorrência em Mongo descartável e revisão total pendentes |
| T08 | Vínculos e registros legados | Sem organização ou propriedade confirmada, o acesso segue política de negação e regularização auditável. | Fixtures legadas com poda, medição, histórico e agenda. | Parcial: código de reconciliação presente; integração pendente |
| T09 | Convites e sessão | Convites são limitados à organização e ciclo de vida; desligamento revoga acesso conforme o contrato. | Testes de convite, refresh, logout e conta desativada. | Pendente: cadastro não exige confirmação do e-mail e logout não revoga refresh token no servidor |
| T10 | Edição completa | ADMIN edita todas as seções, pré-visualiza, salva, publica e restaura sem deploy. | E2E do editor e visitante em sessão independente. | Parcial: editor e API implementados; unitários passam, mas o fluxo persistido no browser segue pendente |
| T11 | Exclusividade e mídia | Só ADMIN acessa editor e mídia de rascunho; visitante lê somente conteúdo/ativos publicados. | Teste HTTP por papel e navegador com ativos de rascunho/publicados. | Parcial: oito rotas ADMIN passam no teste de guardas; serviço limita mídia pública a ativo publicado; HTTP com papel e banco pendentes |
| T12 | Links, imagens e acessibilidade | Uploads e links inválidos são rejeitados; navegação, âncoras, teclado, foco, alt e mobile funcionam. | Testes unitários, HTTP e Playwright em tamanhos móveis e desktop. | Parcial: validação backend e renderizador implementados; Playwright não executado porque os navegadores do Playwright não estão instalados neste ambiente |
| T13 | Cache, publicação e restauração | Versão pública troca após confirmação; restauração recupera conteúdo e ativos; histórico preserva autor e data. | Testes de publicação com sessões independentes e cache de homologação. | Parcial: testes unitários cobrem publicação idempotente e restauração; cache e publicação em Mongo/domínios pendentes |
| T14 | Domínios, origens e armazenamento | Redirects, CORS, cookies, cache e navegação não reapresentam dados após logout/troca de conta. | Testes em domínios de homologação e inspeção do armazenamento do navegador. | Pendente |

## Ordem de execução

1. Fixar os snapshots e concluir o inventário; resolver diferenças entre fontes e testes.
2. Fechar a matriz de autorização de cada operação e adicionar regressões por papel, organização, propriedade e legados.
3. Implementar persistência editorial, armazenamento privado/publicável de mídia e API ADMIN; testes unitários e build local passaram.
4. Adaptar o conteúdo público ao modelo tipado, reutilizar o renderizador e adicionar o editor ADMIN em código local.
5. Executar testes de frontend, E2E autenticado e integração em Mongo descartável; revisar diffs e completar evidências.

Homologação, publicação e liberação ficam fora desta revisão local até haver snapshot limpo, ambiente de teste e evidência dos critérios aplicáveis.
