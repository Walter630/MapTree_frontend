# SDD — Edição da localização da árvore pelo mapa

## Objetivo

Permitir que o funcionário responsável pela árvore ou o gestor da empresa corrija sua localização arrastando o marcador no mapa, revise o endereço, confirme a gravação e consulte um histórico auditável da alteração.

## Regras

- Funcionário edita somente árvore da própria empresa com `createdById` igual ao seu ID. Gestor edita somente árvores da empresa vinculada à sessão. O backend repete essas verificações em cada chamada.
- A posição arrastada é uma prévia local até o usuário confirmar. Cancelar restaura a posição anterior e não grava auditoria.
- Ao abrir a edição, o cliente lê novamente a árvore e usa `updatedAt` da resposta como versão esperada. Gravações concorrentes retornam `409`; a interface mantém o rascunho e pede que o usuário recarregue os dados antes de tentar novamente.
- O backend valida faixa numérica de latitude/longitude e verifica o ponto no polígono oficial da empresa. A gravação do ponto e do histórico de alteração é transacional.
- O histórico guarda árvore, empresa, responsável, data, posição anterior e posição nova. O endereço é revisto pelo usuário; a interface não substitui o endereço sem validação automática.
- Após resposta persistida, a interface atualiza os marcadores e caches carregados e recarrega a rota diária aberta para usar a nova coordenada nos destinos.

## Fluxo e contrato

1. Clique, toque ou ativação por teclado no marcador abre o painel de análise. Esse painel oferece **Editar localização** ao funcionário autor e ao gestor da empresa.
2. O usuário ativa o arraste no marcador destacado. Ao soltar, o mapa apresenta coordenadas e campo editável do endereço antes de salvar.
3. `PATCH /api/trees/:id/location` recebe `{ latitude, longitude, address?, expectedUpdatedAt }`. O servidor valida escopo, versão e limite municipal; atualiza o cadastro e cria a auditoria na mesma transação.
4. `GET /api/trees/:id/location-history` retorna o histórico apenas quando o ator pode consultar a árvore.
5. Sucesso aplica o registro retornado no mapa. Erro de rede mantém coordenadas e endereço no diálogo para nova tentativa; conflito permite recarregar a versão atual. Cancelar restaura o ponto inicial.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
|---|---|---|
| Arrastar em desktop e celular | Marcador destacado segue o ponteiro/toque; posição só muda após salvar | Teste de navegador em ambos os viewports |
| Cancelar antes ou depois de soltar | Marcador retorna ao ponto original e nenhuma auditoria é criada | Teste de componente/serviço |
| Funcionário autor e gestor da empresa | Ambos conseguem abrir edição; funcionário não autor e outra empresa recebem recusa | Teste de serviço/controller |
| Coordenada fora do limite municipal ou inválida | API recusa e não grava árvore nem auditoria | Teste de serviço/controller |
| Falha de rede e reenvio | Rascunho fica disponível; clique duplicado é bloqueado; CAS impede auditoria duplicada | Teste de componente/serviço |
| Duas edições concorrentes | A segunda recebe `409` e precisa revisar a versão atual | Teste de serviço/navegador |
| Gravação confirmada | Endereço e coordenadas persistem; histórico tem ator, horário e posições anterior/nova | Teste de serviço com transação |
| Rota diária aberta ao mover uma árvore | Destino no mapa e link de navegação usam a coordenada atualizada | Teste de navegador |

## Falhas e compatibilidade

- Árvores sem autoria confirmada não oferecem edição para funcionário; gestor ainda pode editar árvores da própria empresa.
- Malha municipal ausente ou inválida mantém o comportamento fail-closed já existente.
- Falha de auditoria cancela também a alteração da árvore. Não há sucesso parcial.
- Endereços não são geocodificados automaticamente. O campo existente é apresentado para revisão e pode ser corrigido no diálogo.
