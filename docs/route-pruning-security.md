# Rota diária, registro de poda e controle de acesso

## Experiência de campo

A página `/:perfil/routes/daily` reúne planejamento e execução (perfis `user`,
`manager` e `admin`). Depois de salvar a rota, cada parada mostra o número,
a espécie, a identificação completa e as coordenadas da árvore.

**Registrar poda desta árvore** abre o formulário na mesma página, com a árvore
já vinculada. O usuário informa intensidade, data real do serviço e observações.
**Salvar e próxima árvore** avança para a próxima parada pendente. A conclusão
mostra os detalhes registrados e atualiza o progresso. Poda leve também é serviço
concluído; intensidade não é um indicador de conclusão nem garantia de risco resolvido.

O histórico apresenta a identificação completa, o responsável pelo registro e,
quando disponível, a parada e a data da rota. Registros anteriores sem vínculo
com rota continuam no histórico autorizado. O cadastro avulso permanece disponível.

## Persistência

- `MaintenanceSchedule.userId`: dono da parada, definido pela API a partir da sessão.
- `MaintenanceSchedule.routeOrder`: posição planejada.
- `Pruning.scheduleId`: vínculo do serviço com a parada.
- `POST /api/scheduling/:id/complete`: valida acesso, registra a poda e conclui a
  parada em uma transação MongoDB. A árvore vem do agendamento; o navegador não
  escolhe outro ID nesse endpoint.
- A transação usa a transição `PENDING → COMPLETED`; uma segunda conclusão retorna
  409 e não cria outra poda. Falha de gravação não apresenta sucesso no frontend.
- A data da última poda é atualizada, sem declarar a árvore segura automaticamente.
- Salvar uma rota novamente reutiliza a parada do mesmo usuário/árvore/tipo/dia.
- Remover uma parada planejada cancela o agendamento. Paradas concluídas preservam
  o serviço e não podem ser removidas/reabertas por esses endpoints.

Os novos campos são opcionais para compatibilidade com documentos Mongo existentes.
Não houve atualização em massa, exclusão de dados anteriores ou atribuição presumida
para agendamentos sem dono. Agendamentos antigos sem `userId` ficam acessíveis somente
à administração até que seu responsável seja definido por um processo explícito.
O cache do navegador é separado por identidade e removido ao encerrar a sessão.

## Autenticação e autorização

A API NestJS registra os guards de autenticação e perfil globalmente. Cada endpoint
operacional exige autenticação por padrão, inclusive novos controllers. A exceção
explícita são os cinco POSTs do ciclo de autenticação: login, Google, cadastro público,
refresh e logout. O cadastro público fixa o perfil USER e não aceita vínculo arbitrário
com uma organização. O cadastro administrativo de gestores usa `POST /users` com MANAGER.

O token de acesso tem `tokenType: access`; o cookie HttpOnly de renovação usa
`tokenType: refresh`. Um não substitui o outro. A estratégia de acesso consulta a
conta atual para aplicar perfil, organização e ativação vigentes, em vez de continuar
usando privilégios antigos de um JWT ainda não expirado. Um gestor também é reconhecido
pela relação existente de responsável da organização, sem migrar o cadastro no banco.
Tokens emitidos antes dessa mudança precisam de um novo login.

Falha de rede ou erro temporário 5xx durante o refresh preserva os tokens; somente
401/403 confirmados pela API removem a sessão nesse fluxo. Se o perfil não puder ser
validado, a página protegida não é liberada e a tela de acesso oferece uma tentativa
sem exigir nova senha. Na configuração local validada, o acesso expira em 10 minutos
(e é renovado automaticamente), o JWT de refresh em 30 dias e o cookie em 7 dias;
a permanência efetiva sem novo login é limitada ao cookie de 7 dias. O refresh atual
não estende esse cookie. Dois clientes da mesma conta podem acessar e renovar de
forma independente; o logout de um limpa somente o cookie daquele cliente.

Funcionários consultam suas próprias podas e rotas. Gestores consultam suas próprias
atividades e as dos usuários vinculados à organização. Sem organização, não há fallback
para listar toda a base de usuários. Operações como importar, limpar a base, remover
árvores e gerenciar organizações ficam restritas aos perfis autorizados. Respostas de
perfil e gerenciamento de usuários não incluem o hash da senha.

O inventário de árvores e o catálogo de espécies continuam compartilhados entre contas
autenticadas: o modelo atual não atribui árvores a organizações. Isso não representa
isolamento de inventários por empresa. As restrições de histórico e usuários são
aplicadas separadamente no servidor.

A documentação Swagger não é servida por padrão. Para habilitar, use
`ENABLE_API_DOCS=true`; o acesso exige bearer de acesso e conta ADMIN ativa.
No frontend, apenas login/cadastro/recuperação são públicos. As outras páginas
exigem sessão, as áreas exigem o perfil correspondente e a falha ao consultar o perfil
não libera a página protegida.

## Administração

Empresas, gestores e seus cadastros usam superfícies neutras e ações azuis, com
navegação comum. As listas têm busca, filtro por status, paginação real, estados
de carregamento/erro e confirmação de exclusão. Não usam percentuais ou pendências
inventados. Editar usa uma cópia do registro; cancelar não altera a linha da listagem.
Erro ao salvar preserva os campos e mantém o diálogo aberto.

## Validação e publicação

Foram executados testes HTTP dos 64 endpoints operacionais contra acesso anônimo,
rejeição de ações administrativas para funcionário, conta inativa, distinção entre
tokens, escopo e concorrência de conclusão. O frontend cobre vínculo da árvore,
preservação do formulário em erro, duplo clique, isolamento do cache e guards.

A API e o Mongo locais também foram exercitados com árvores temporárias isoladas:
criar parada, registrar poda leve, restaurar histórico e recusar repetição. No navegador,
o registro de uma parada temporária atualizou o andamento de 1/2 para 2/2. Apenas
as árvores e os registros desses testes foram removidos ao concluir. Os formulários
administrativos foram inspecionados sem criar contas ou excluir cadastros reais.

As alterações não foram publicadas. Para implantar, atualize primeiro o backend com
`npm ci`, `npm run db:generate` e `npm run build`, reinicie o processo da API e só então
publique o novo frontend. O Mongo precisa de replica set para as transações; a instância
local usada na validação já possui essa configuração. Não exponha arquivos `.env`.

Referências: [guards globais no NestJS](https://docs.nestjs.com/recipes/passport)
e [conector MongoDB e replica set no Prisma](https://www.prisma.io/docs/orm/overview/databases/mongodb).
