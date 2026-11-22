# SDD: Rota diária compartilhada por empresa

## Objetivo

Fazer com que a rota diária criada pelo gestor fique visível para os funcionários ativos da mesma empresa e possa ser executada por um funcionário. Funcionários também podem planejar e executar suas próprias paradas. O gestor acompanha e gerencia a agenda; não registra execução de campo.

## Escopo e regra

- A leitura da agenda diária e do resumo mensal usa o escopo da empresa, preservando o isolamento entre empresas.
- Funcionários leem paradas da própria conta e paradas planejadas por gestores da mesma empresa. Ao concluir uma parada do gestor, o registro de poda fica associado ao funcionário executor.
- Funcionários não removem nem duplicam parada planejada pelo gestor. O gestor pode gerenciar paradas da empresa.
- Somente o perfil USER conclui uma parada de poda. O servidor aplica a regra além de ocultar ações na interface.
- Rotas administrativas sem empresa vinculada mantêm o comportamento atual.

## Cenários de aceite

| Cenário | Resultado esperado | Verificação |
| --- | --- | --- |
| Gestor planeja uma parada para árvore da empresa | Funcionário da mesma empresa vê a parada no mesmo dia | Teste de serviço com dois usuários da mesma empresa |
| Funcionário tenta ler rota de outra empresa | Nenhuma parada da outra empresa é retornada | Teste de escopo por organização |
| Funcionário conclui parada planejada pelo gestor | Uma poda é persistida com o funcionário como executor e a parada muda para concluída | Teste transacional e fluxo local no navegador |
| Funcionário altera/remover parada planejada pelo gestor | A parada do gestor permanece intacta | Teste de serviço |
| Gestor tenta registrar conclusão de campo | Requisição é recusada e nenhum registro de poda é criado | Teste de autorização |
| Funcionário planeja parada própria | A parada aparece na agenda compartilhada da empresa | Teste de serviço e navegador |

## Dados existentes e falhas previsíveis

Paradas já vinculadas a `userId` continuam atribuídas ao planejador; a leitura compartilhada não reatribui dados. Se uma árvore já tiver parada ativa no dia, outra pessoa não cria uma duplicata. Uma falha na execução não pode alterar o status da parada nem criar registro parcial.

## Dependências e entrega

Mudança no escopo de leitura e execução da API de agendamento, testes do serviço de agendamento e confirmação no frontend dos perfis gestor e funcionário. Sem migração de banco. Validar localmente antes de qualquer commit ou push.
