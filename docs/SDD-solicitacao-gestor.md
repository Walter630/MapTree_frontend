# Solicitação pública de acesso como gestor

## Objetivo

Permitir que um visitante solicite acesso como gestor, acompanhe a análise e receba permissões empresariais somente depois da aprovação de um administrador da plataforma.

## Estado da implementação (18/11/2026)

- O formulário `/cadastro` agora envia nome, CPF, telefone, e-mail, senha, empresa e município/UF para `POST /api/auth/manager-requests`.
- O backend de desenvolvimento está em `/home/josewalter/.codex/worktrees/maptree-painel-funcionario/backend-maptree`, revisão `22089eaa`, com alterações locais preexistentes preservadas.
- A API NestJS/Prisma/MongoDB agora mantém solicitação, histórico de revisões e caixa de saída de e-mail. A nova conta começa como `USER`, sem organização; `/api/auth/register` legado retorna `410` para não criar conta sem solicitação.
- Foram adicionados acompanhamento próprio, reenvio após rejeição e rotas administrativas de busca, detalhe, aprovação e rejeição.
- O banco descartável foi confirmado pelo responsável. O seed atualizado correspondente ao checkout concluiu; depois, `prisma db push` criou as três coleções e os índices da solicitação/outbox.
- A API está ativa em `http://127.0.0.1:4000/api`. O smoke test HTTP confirmou login administrativo (`201`), listagem autenticada (`200`), listagem anônima (`401`) e cadastro incompleto (`400`); nenhuma solicitação válida foi criada.
- A suíte unitária do backend passou: 25 suítes, 215 testes. A compilação TypeScript/Nest em diretório temporário passou. No frontend, passaram 36 arquivos/164 testes, `npm run type-check`, `npm run lint:check` e `npm run build`.
- A tela de cadastro foi inspecionada no navegador em 1440×900 e 390×844; o layout Tailwind responde em desktop e celular. Os testes de unidade cobrem acompanhamento e lista administrativa. O navegador isolado não conseguiu alcançar a API local para autenticar e executar o painel completo.
- Ainda não foi criado um cadastro válido pela API nem disparado e-mail real: não foi informada uma caixa de teste dedicada. A entrega SMTP, o fluxo de transação com replica set e a aprovação/rejeição de ponta a ponta continuam pendentes de validação com esse mailbox.
- Não foi localizada fonte oficial de polígonos municipais. A aprovação registra nome/UF confirmados; código IBGE e geometria oficial podem ser fornecidos juntos, sem inferir limites. Novas empresas ficam sem geometria até essa configuração.
- A relação legada `Organization.managerId` representa o gestor principal; a aprovação para uma empresa existente também vincula o novo gestor por `User.organizationId`. As verificações de escopo passam a aceitar gestores ativos ligados àquela empresa.
- Uma tentativa anterior executou o seed antigo em `/home/josewalter/IdeaProjects/backend-maptree`; ele falhou com P2014 após remover apenas solo e podas, antes de apagar árvores, empresas ou usuários. O seed atualizado foi executado com sucesso no banco descartável do checkout acima.

## Regras de negócio

1. O cadastro público cria a conta e uma solicitação pendente na mesma gravação lógica.
2. O papel e o vínculo da empresa são definidos exclusivamente no servidor. Uma solicitação pendente não concede acesso a dados de empresa.
3. A pessoa pode entrar e consultar o estado da própria solicitação.
4. Um administrador ativo aprova a solicitação para uma organização existente ou uma organização nova, após confirmar o município.
5. A aprovação altera o papel para `MANAGER`, estabelece o vínculo da organização, grava a decisão e registra a comunicação na mesma transação.
6. A rejeição exige justificativa. A pessoa pode corrigir e reenviar; o histórico conserva a versão anterior e o estado volta para `PENDENTE`.
7. Decisões simultâneas ou repetidas resultam em uma única decisão efetiva.
8. A repetição de cadastro não cria conta ou solicitação duplicada; conflitos de e-mail/CPF são tratados pelas restrições únicas do banco.

## Contrato implementado

O contrato abaixo está implementado no backend e consumido pelo frontend. A validação ponta a ponta com e-mail real e transações do MongoDB ainda depende do ambiente de homologação.

### Cadastro

`POST /api/auth/manager-requests` — público.

Payload permitido: nome, CPF, telefone, e-mail, senha, nome da empresa solicitada e município/UF informados. O identificador IBGE e o limite geográfico devem ser confirmados no processo administrativo. Ignorar ou rejeitar qualquer campo de papel, organização ou privilégio enviado pelo cliente.

Resposta de sucesso: `202` com identificador, versão, estado `PENDENTE`, data, nome da empresa e município solicitados. A senha nunca aparece na resposta, no histórico ou na notificação.

### Acompanhamento e correção

- `GET /api/users/me/profile` inclui somente o estado e os dados da solicitação do usuário autenticado.
- `GET /api/users/me/manager-request` retorna os detalhes da solicitação própria.
- `PATCH /api/users/me/manager-request` só aceita alteração quando rejeitada, registra uma nova versão e retorna a solicitação para `PENDENTE`.
- Exigir sessão e comparar o proprietário pelo usuário autenticado; não aceitar `userId` do cliente.

### Administração

- `GET /api/admin/manager-requests` — lista paginada, busca e filtros por estado/município; apenas `ADMIN`.
- `GET /api/admin/manager-requests/:id` — dados e histórico para análise; apenas `ADMIN`.
- `POST /api/admin/manager-requests/:id/approve` — recebe uma organização existente ou os dados aprovados para nova organização, com município confirmado.
- `POST /api/admin/manager-requests/:id/reject` — recebe justificativa obrigatória.
- Nas ações, usar a identidade do administrador da sessão para auditoria. Nunca confiar em papel, administrador ou município enviados pelo solicitante.

## Persistência, e-mail e concorrência

- Adicionar modelo da solicitação e histórico versionado no Prisma. A solicitação registra proprietário, estado, versão, dados empresariais e municipais, datas, decisão e administrador responsável.
- Criar conta e solicitação em transação MongoDB; o backend documenta uso de replica set.
- Criar uma saída transacional de notificações para admins ativos. Deduplicar por solicitação, versão, evento e destinatário; registrar resultado e tentativas sem bloquear a confirmação do cadastro.
- Na aprovação, gravar organização (se nova), papel/vínculo, decisão, auditoria e eventos de comunicação na mesma transação.
- Proteger decisão concorrente com condição de estado `PENDENTE` dentro da transação; retornar conflito para a decisão desatualizada.
- Armazenar município confirmado por código IBGE e geometria oficial. Não inferir limites a partir do nome nem usar uma caixa retangular como substituto de limite municipal.

## Falhas e compatibilidade

- Erro de banco durante a transação não deixa conta parcialmente provisionada.
- Falha de e-mail deixa um evento recuperável e não apaga a solicitação confirmada.
- Usuários legados sem vínculo ou solicitação não devem ser convertidos automaticamente em solicitantes; não há evidência que permita inferir sua intenção.
- Login continua consultando o estado autorizado pelo servidor. Solicitação pendente/rejeitada direciona ao acompanhamento; conta inativa continua sem acesso.
- O cadastro de funcionário por convite conserva fluxo e autorização próprios.

## Testes e aceite

- Unidade: validação de payload, papel fixado no servidor, transições, revisão, deduplicação e concorrência.
- HTTP/API: cadastro público, acompanhamento próprio, isolamento entre usuários, recusa a perfil não admin e aprovação/rejeição apenas por admin.
- Integração em MongoDB descartável com replica set: cadastro → aviso → aprovação/rejeição; rollback, repetição e decisão concorrente.
- Frontend: cadastro válido/inválido, sucesso, pendente, rejeição, correção, atualização e bloqueio de acesso empresarial.
- Homologação: verificar vínculo, organização e e-mail após recarregar; usar contas e e-mail de teste.

## Dependências para validar gravações

O responsável confirmou que o banco usado pelo seed é descartável. O seed atualizado terminou com sucesso; o schema novo foi aplicado sem reset de dados. A API local está ativa e foi validada com a conta de demonstração. Ainda falta uma caixa de e-mail exclusiva para verificar envio e falhas SMTP sem contatar destinatários reais. Também falta uma fonte oficial de polígonos municipais para configurar limites geográficos de novas empresas.

## Critérios implementados e pendentes

- **Implementado em código:** submissão com dados pessoais e empresariais, papel fixado no servidor, CPF/telefone, acompanhamento autenticado, revisão versionada, correção após rejeição, listagem administrativa, decisão concorrente condicionada a `PENDENTE`, transação de aprovação, e-mail em outbox com deduplicação e retentativas.
- **Validado:** schema Prisma; geração do cliente; compilação backend; 25 suítes/215 testes; 36 arquivos/164 testes frontend; type-check, lint e build frontend; login de ADMIN, leitura administrativa autorizada, bloqueio anônimo (`401`) e rejeição de cadastro incompleto (`400`); coleções e índices após `db push`; layout do cadastro em desktop e celular.
- **Pendente antes de concluir a Sprint 2:** cobertura HTTP automatizada de todas as permissões e percurso válido cadastro→e-mail→análise→aprovação/rejeição com MongoDB replica set e mailbox de teste. Não foi feito login e navegação no painel administrativo via navegador porque a sessão isolada não alcançou a API local. A ausência de mailbox impede disparar notificações reais nesta validação.
