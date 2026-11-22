# SDD — Edição de árvore pelo funcionário

## Objetivo

Permitir que um funcionário atualize uma árvore cadastrada por ele, a partir do mapa, sem ampliar o acesso a árvores de outros funcionários ou empresas.

## Regra de negócio

- O funcionário só pode editar árvores cujo `createdById` seja seu próprio ID e cujo `organizationId` corresponda à empresa ativa da sessão.
- A API continua sendo a autoridade da permissão. A interface oculta a ação para árvores sem autoria confirmada e trata a recusa da API sem apagar os dados do formulário.
- A edição atualiza espécie, coordenadas, status, vigor e idade aproximada. Medições de altura e copa permanecem no histórico de medições; editar uma árvore não cria uma medição nova.
- Gestores e administradores mantêm as permissões da API existentes.
- A atualização envia `expectedUpdatedAt`. Se outro usuário salvar antes, a API responde conflito e o formulário permanece preenchido para recarregar e tentar de novo.

## Fluxo e contrato

1. No mapa do funcionário, o popup mostra **Editar árvore** apenas quando a árvore tem `createdById` igual ao usuário autenticado.
2. A rota `/user/trees/:treeId/edit` carrega o registro por `GET /trees/:id` e preenche o formulário existente.
3. Salvar envia `PATCH /trees/:id` com os campos alterados e `expectedUpdatedAt`.
4. A tela só confirma sucesso quando a resposta inclui o registro persistido; o botão de retorno preserva o contexto básico do mapa.

## Compatibilidade e falhas

- Árvores legadas sem autor verificável não exibem **Editar árvore** para funcionário.
- Árvore de outra pessoa ou empresa deve ser recusada pelo backend mesmo se o usuário chamar a rota ou endpoint diretamente.
- Falhas de leitura, validação, autorização e conflito mantêm a tela em estado explícito e preservam os valores preenchidos.
- Altura e largura da copa continuam sendo medições; não são sobrescritas pelo formulário de cadastro/edição.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
|---|---|---|
| Funcionário abre árvore que cadastrou | O popup mostra **Editar árvore** | Teste de navegador com `createdById` igual ao perfil |
| Funcionário abre árvore de colega ou legado sem autor | O popup não oferece edição | Teste de navegador |
| Funcionário salva edição própria | A tela envia `PATCH` com `expectedUpdatedAt`, confirma a resposta persistida e mantém histórico de medições | Teste de navegador e teste de serviço |
| Funcionário tenta editar árvore alheia ou de outra empresa por URL/API | A API recusa sem gravar | Teste de serviço/controller |
| Registro muda durante a edição | A API responde conflito; formulário preserva valores e informa recarregamento | Teste de serviço e navegador |
| API falha ao carregar ou salvar | Erro legível; valores continuam disponíveis | Teste de componente/navegador |

## Fora de escopo

Excluir árvores e alterar o histórico de medições não fazem parte desta edição.
