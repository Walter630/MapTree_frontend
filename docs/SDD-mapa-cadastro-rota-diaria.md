# Mapa, poda, rota diária e temas

## Objetivo e escopo

Entregar as correções de campo e de risco descritas no relatório: filtro de espécie reconhecível e sincronizado com marcadores e calor; cadastro iniciado no mapa; risco operacional consistente com `effectiveStatus`; análise de IA e vigor identificados separadamente; poda vinculada à árvore selecionada; planejamento diário com salvamento imediato; execução em uma tela própria; e preferência de tema claro ou escuro. Preferências ausentes ou legadas iniciam em claro. A configuração das regiões da empresa e a região principal do funcionário ficaram fora desta entrega; a decisão de produto foi tomada depois e está especificada em [SDD-municipio-empresa-e-dominios.md](SDD-municipio-empresa-e-dominios.md).

## Regras e contratos

### Mapa e calor

- A seleção parte das árvores carregadas no recorte atual, exclui os registros de demonstração e combina status e categoria adicional (por exemplo, espécie). Marcadores, contagens do recorte e pontos/células de calor derivam dessa seleção; uma atualização de filtro recalcula todas as camadas.
- `GET /trees`, `GET /trees/map`, `GET /trees/map/risk` e `GET /trees/:id` expõem `effectiveStatus`, calculado no backend pela regra de maior gravidade entre o status salvo e o resultado da medição. O frontend usa esse campo para marcador, filtro, legenda e selo “Risco operacional”; `measuredStatus` e `status` são fallbacks legados.
- `CRITICAL` e `TO_PRUNE` são filtros exatos. `ALL` inclui todos os status retornados, inclusive `UNDER_OBSERVATION` e `PRUNED`. A data da última poda permanece no detalhe da árvore, independente do status efetivo.
- `GET /trees/:id/ai-prediction` recebe `referenceWireHeightM` quando `GET /trees/:id` fornece uma referência válida. O backend usa a altura média cadastrada para a espécie no parâmetro interno destinado à espécie; o valor da referência precisa corresponder ao local da árvore. A previsão e o vigor são apresentados separadamente do `effectiveStatus`.
- A previsão só é apresentada como válida quando contém altura estimada e altura de referência da fiação válidas. Sem esses dados, o card mostra “Previsão indisponível”; o vigor e o risco operacional continuam legíveis como campos separados.
- O card usa as cores de texto e superfície do tema para manter pelo menos 4,5:1 de contraste para texto comum. Os indicadores de risco têm texto e ícone junto à cor.
- O drawer da análise de IA desmonta o card ao fechar pelo botão, por Escape ou pelo controle da gaveta. O fechamento invalida consultas pendentes para que respostas antigas não restaurem o card; abrir outra árvore inicia uma consulta nova.
- A lista de espécies mantém todas as espécies visíveis, mostra a contagem e usa uma caixa de seleção. Uma espécie por vez pode ser selecionada; tocar novamente limpa o filtro. Marcadores, contagens e pontos de calor usam a mesma seleção.
- A seleção vazia limpa marcadores e calor e exibe “Nenhuma árvore para estes filtros”. Com `routeDate` ativo, o calor fica vazio e a camada da rota é a única camada de pontos operacionais.

### Cadastro iniciado no mapa

- “Cadastro rápido” pede a espécie e mantém a seleção para os próximos pontos. O clique no mapa posiciona um pino de prévia; “Salvar e continuar” confirma a coordenada, grava e atualiza somente o marcador criado no estado local. Após a resposta, o ponto é limpo e a equipe permanece no mapa pronta para outra árvore.
- Se a criação rápida falhar, ponto e espécie permanecem na tela; repetir o mesmo payload reutiliza a mesma chave. “Cadastro completo” continua disponível no cartão do ponto e abre `/{admin|manager|user}/trees/new` com latitude e longitude preenchidas e editáveis.
- O cadastro completo valida latitude em `[-90, 90]` e longitude em `[-180, 180]`. A barra junto à ação mostra 50% após a confirmação da árvore e 100% quando não há medição ou após a API confirmar a medição. Falha na segunda gravação preserva o aviso parcial e permite reenviar apenas a medição.
- `POST /trees` exige `Idempotency-Key` com até 128 caracteres e associa a chave à conta autenticada. O backend grava árvore, chave/hash do pedido e trabalho de solo na mesma transação MongoDB. Repetir a chave e o payload devolve o mesmo registro; reutilizar a chave com dados diferentes retorna `409`.
- A resposta da criação inclui `soilStatus: PENDING` sem aguardar SoilGrids. O worker processa os trabalhos com concorrência limitada, leases para recuperação após reinício e até cinco tentativas com espera exponencial; o mapa informa “Solo em processamento”.
- O contexto de retorno inclui a rota de mapa correspondente ao perfil, centro, zoom e identificador da região selecionada. Depois da confirmação da gravação, “Voltar ao mapa” restaura esse contexto. Os filtros permanecem aplicados no mapa e a nova árvore aparece se corresponder a eles.

### Candidatas próximas na edição da rota

- Ao editar, as paradas confirmadas permanecem na seção “Na rota”. As candidatas são buscadas separadamente por espécie ou pelo botão “Perto de mim”; abrir o editor não carrega todo o catálogo.
- O GPS é consultado uma vez. Se falhar, a equipe pode escolher um ponto no mapa. A consulta compacta `GET /trees/nearby?lat=...&lng=...&radius=2&limit=50&compact=true` retorna os campos da lista e `distance_km`, ordenados por distância. “Ampliar para 5 km” expande a busca quando necessário.
- O contrato compacto limita raio a 5 km e resultados a 50. Paradas selecionadas continuam em “Na rota” mesmo fora do raio; sequência e numeração executáveis são sempre fornecidas pelo servidor.

### Registro de poda

- A busca da árvore é o primeiro campo, aceita espécie ou identificador e prioriza as paradas pendentes da data escolhida. O inventário restante continua disponível para poda avulsa.
- Antes de salvar, a tela mostra espécie, ID e localização da árvore selecionada e exige uma seleção válida.
- Uma poda iniciada pelo marcador ou pela rota abre o formulário com `treeId` e data na URL. Uma parada vinculada usa `POST /scheduling/:id/complete`; o trabalho sem parada usa `POST /pruning` com `idTree`.

### Temas

- `App.vue` centraliza a preferência e aplica o tema Vuetify e `data-theme` à raiz antes da primeira renderização.
- O tema escuro usa carvão neutro (`#101214` na tela e `#191C20` nos cartões); os papéis de texto e superfície vêm das cores semânticas do Vuetify. Texto e ícone de botões preenchidos preservam o contraste calculado em hover, foco e pressão.
- A marca existente ganha a variante branca transparente por filtro de cor, mantendo dimensões e proporções em barra desktop, menu móvel, login e landing.
- Preferências explícitas `light` e `dark` são preservadas. Preferências ausentes, inválidas ou legadas (`system`) iniciam em claro. Se `localStorage` estiver indisponível, a escolha vale durante a sessão.
- A barra superior mostra um controle acessível em desktop e celular: lua com “Ativar tema escuro” no claro e sol com “Ativar tema claro” no escuro. Não há seletores duplicados no menu.
- Navegação, painéis, formulários, diálogos, tabelas, gráficos, popups do Leaflet e avisos usam os papéis de cor do tema. Textos comuns mantêm contraste mínimo 4,5:1; indicadores de risco combinam cor, rótulo e ícone.
- Trocar o tema não reinicia formulários, rota selecionada ou posição do mapa.

### Rota diária

- Painel e menu têm uma única entrada “Rotas” por perfil, reutilizando a URL de rota existente. Sem `date`, abre a lista; com `?date=AAAA-MM-DD`, abre diretamente a rota daquela data, inclusive após recarga ou link compartilhado.
- A lista começa no mês local atual e solicita somente `GET /scheduling/daily-route?month=AAAA-MM`. Cada linha representa uma data com paradas de poda pendentes ou concluídas, destaca hoje quando há rota e mostra totais pendentes/concluídos. Uma ação “Planejar rota” escolhe a data, inclusive quando a lista está vazia.
- A API valida mês/data no fuso `America/Sao_Paulo`, restringe a leitura ao ID do usuário autenticado em todos os perfis e retorna `400` para entrada inválida, `401` sem sessão e `404` para árvore ausente/inacessível. `PUT /scheduling/daily-route/:date/stops/:treeId` aceita somente `{ selected: boolean }`; mudar uma parada concluída retorna `409`.
- Seleção e ordem persistem juntas em `MaintenanceSchedule`. Uma chave interna única por usuário/data serializa escritas, inclusive a primeira seleção concorrente. Criação, conclusão, cancelamento e remoção de paradas de poda existentes respeitam a mesma serialização. Conflitos transitórios do MongoDB têm repetição limitada; ao esgotar tentativas, a atualização retorna `409` para nova tentativa.
- `true` adiciona ou reativa uma parada pendente; `false` cancela uma pendente. Repetir o estado mantém uma única parada ativa. Registro e histórico das concluídas são mantidos.
- Antes da primeira parada concluída, a primeira parada permanece como origem e as demais seguem vizinho mais próximo, com desempate pelo ID da árvore. Se a origem for removida, a primeira parada restante na ordem persistida vira a origem. Após a primeira conclusão, os números existentes são preservados e novas paradas são anexadas.
- Ao abrir uma data, a tela solicita somente `GET /scheduling?date=AAAA-MM-DD&mine=true`, inicia em “A fazer” e apresenta “Concluídas” separadamente. Pendentes/concluídas usam `routeOrder`; `CANCELLED` não aparece. O catálogo só é carregado no editor, usando a consulta e paginação existentes e apenas os campos usados pela seleção, busca e classificação.
- Na rota, “Voltar” e “Editar” ficam no cabeçalho; “Mapa” fica junto à lista e só inicializa o mapa quando aberto no celular. As paradas pendentes usam a ação “Registrar poda”, destacam a próxima parada e mostram ordem, espécie (ou “Árvore sem espécie”), identificação e localização.
- A lista mensal não inicializa Leaflet. A abertura da rota carrega somente as paradas da data. Após `PUT` bem-sucedido, a interface usa a resposta para atualizar lista e mapa sem reler a agenda.
- `routeOrder` retornado pelo servidor é a numeração de referência. Concluir uma parada atualiza a agenda e recarrega as duas listas; a sequência pendente preserva os números originais, sem renumerar as paradas restantes.
- Planejamento grava cada seleção imediatamente com `PUT /api/scheduling/daily-route/:date/stops/:treeId` e corpo `{ selected: boolean }`. O endpoint autentica o usuário, restringe alterações às paradas do tipo `PRUNING` da própria rota e devolve as paradas com os campos usados pela lista e pelo mapa, incluindo `routeOrder` confirmado.
- Cada chamada é atômica: seleção e ordem são gravadas na mesma transação. Repetir o mesmo estado é idempotente e não cria duplicatas. Escritas da mesma rota diária são serializadas/protegidas contra concorrência, inclusive quando chegam de dispositivos diferentes; a resposta representa o estado persistido pelo servidor.
- Antes da primeira parada ser concluída, a primeira parada marcada permanece como origem e as demais são ordenadas pela menor distância à parada anterior, com desempate pelo ID da árvore. Ao remover a origem, a primeira parada ainda marcada passa a ser a origem. Depois da primeira conclusão, as ordens existentes são preservadas; novas seleções recebem números após a última ordem existente, sem renumerar paradas atendidas.
- A interface mostra “Salvando”, “Salvo” ou “Tentar novamente” na parada afetada. Até a confirmação, a seleção exibida permanece no último estado confirmado pelo servidor. Falha de rede conserva esse estado e permite repetir a mesma alteração. A conclusão confirmada pela API move a parada para “Concluídas”, destaca a próxima e mostra confirmação em snackbar com espécie e totais.
- “Planejar rota” é uma ação independente. Snapshots locais servem apenas para rascunhos do planejamento; não adicionam pontos à rota executável ou ao mapa principal.
- Snapshots de planejamento anteriores a esta versão nunca são enviados automaticamente. A interface apresenta os rascunhos encontrados e pede confirmação explícita antes de importar cada seleção para a agenda do servidor.
- “Ver rota no mapa” abre a rota do perfil com `routeDate` na URL. O mapa consulta novamente a agenda para a data e desenha apenas as paradas `PENDING` da API, em ordem salva. `CANCELLED` e `COMPLETED` não entram na rota.
- A lista, o mini-mapa da página, o mapa da rota diária e o mapa principal usam a sequência confirmada pela API. O roteador viário recebe waypoints nessa ordem. Se falhar, os pontos numerados permanecem e a interface informa que o trajeto pelas ruas está indisponível.
- Falha na leitura da agenda não converte snapshot local em rota executável; a tela informa o erro e permite nova tentativa.

## Dados legados, falhas e consistência

- Árvores sem `effectiveStatus` continuam usando `measuredStatus` e depois `status`; registros sem data de poda mantêm o texto legado “Poda registrada” quando o status salvo for `PRUNED`.
- O cadastro de árvore e a medição inicial continuam sendo gravações distintas. Se a árvore for persistida e a medição falhar, a tela informa o sucesso parcial e permite reenviar somente a medição.
- Uma conclusão só é refletida depois que o endpoint de conclusão confirma o atendimento; a agenda do servidor é recarregada para resolver o estado definitivo.
- O endpoint de seleção valida formato de data, existência da árvore e autorização por usuário. Uma chamada sem sessão retorna `401`; árvore/rota de outro usuário não é alterada e retorna resposta de autorização/not-found sem revelar dados de terceiros. Erros de validação não deixam uma seleção ou ordem parcialmente gravada.
- Ao trocar a data da rota, respostas de uma data anterior são descartadas. Paradas canceladas são excluídas mesmo que ainda apareçam em snapshots locais antigos.
- Este escopo original não implementa a região da empresa nem recorte municipal. A decisão posterior de um município por empresa, a fonte de limites oficiais, o isolamento e o tratamento dos registros legados estão especificados em [SDD-municipio-empresa-e-dominios.md](SDD-municipio-empresa-e-dominios.md); essa especificação passa a governar essa parte do produto.

## Critérios de aceite e verificação

| Cenário | Resultado esperado | Como verificar |
| --- | --- | --- |
| Aplicar `CRITICAL`, `TO_PRUNE` e `ALL`, com status efetivo divergente do salvo | Marcadores, contagens, calor e selo usam `effectiveStatus`; `ALL` inclui observação e a data da poda continua no detalhe | Testes de seleção e execução manual no mapa |
| Alternar espécie na lista e tocar de novo para limpar | Uma espécie por vez; contagem, marcadores e calor acompanham a seleção sem ocultar as outras opções | Teste de interação em desktop/celular |
| Uma árvore tem previsão normal e medição crítica, outra tem status salvo crítico e medição baixa, e uma terceira não tem previsão válida | Marcador, filtro e selo concordam com `effectiveStatus`; a previsão indisponível é explícita; vigor permanece independente | Integração da API de risco e revisão do card em ambos os temas |
| Fechar a análise de IA enquanto os detalhes ainda carregam e abrir outra árvore | O card desaparece ao fechar e a resposta antiga não reaparece nem substitui os dados da árvore seguinte | Interação no drawer e teste de regressão com resposta assíncrona controlada |
| Abrir detalhe com referência de fiação informada para o local | A consulta da previsão envia `referenceWireHeightM`; o backend usa a média da espécie no campo de espécie e devolve a previsão sem alterar a classificação efetiva | Teste de contrato backend e captura da requisição no frontend |
| Trocar rapidamente status e espécie; selecionar resultado sem árvores | Marcadores e calor refletem a mesma seleção em cada troca; no vazio, calor é limpo e aparece “Nenhuma árvore para estes filtros” | Teste de regressão e interação em desktop/celular |
| Tocar no mapa, confirmar o pino e abrir o cadastro | Campos latitude/longitude vêm preenchidos, são editáveis e validados; clique em marcador existente continua abrindo o detalhe | Fluxo manual em desktop/celular e teste do formulário |
| Salvar cadastro com e sem medição inicial | Reutiliza `POST /trees` e a gravação de medição existente; sucesso oferece retorno ao mapa com posição/região restauradas | Testes existentes do cadastro e fluxo com API de homologação |
| Repetir a criação após perda da resposta; reutilizar a chave com payload diferente | Mesmo payload devolve o mesmo ID; payload diferente recebe `409`; chave, árvore e job são atômicos | Teste unitário e integração com MongoDB em replica set descartável |
| Salvar várias árvores pelo mapa com rede intermitente | Espécie permanece, ponto é limpo só após confirmação, e cada ponto salvo aparece sem recarregar o inventário | Teste de navegador móvel e 100 cadastros em homologação |
| Falhar o provedor de solo | Cadastro responde após o commit; o job recebe retry limitado sem bloquear a equipe | Teste do worker e homologação com provedor indisponível |
| Abrir edição e usar GPS, mapa manual, raio 2 km e expansão | Candidatas vêm por distância; selecionadas permanecem na rota fora do raio; busca não carrega todo o catálogo | Teste de API compacta e navegador com GPS permitido/negado |
| Abrir poda pela busca, pelo marcador e pela rota | A árvore fica identificada por espécie, ID e localização antes de confirmar; uma parada usa o endpoint de conclusão e uma poda avulsa usa `POST /pruning` | Testes do formulário e da parada vinculada |
| Trocar entre Claro e Escuro com formulário e diálogo abertos | A mudança é imediata, persistida, acessível por teclado/toque e preserva o estado dos controles | Revisão visual, contraste, foco por teclado e celular |
| Abrir uma data com paradas `PENDING`, `COMPLETED` e `CANCELLED` e três ordens | “A fazer” lista só pendentes; “Concluídas” lista só atendidas com posição/data; canceladas somem | Teste de utilitário e integração com agenda de homologação |
| Marcar e desmarcar uma árvore, repetir a chamada ou editar a mesma rota em dois dispositivos | A resposta e a próxima leitura mostram uma única parada e uma ordem persistida; os estados de erro mantêm a última confirmação | Teste de integração transacional com requisições concorrentes e falha de rede no navegador |
| Marcar várias árvores antes e depois de concluir a primeira parada | Antes da conclusão, a sequência segue vizinho mais próximo com desempate estável; depois dela, as ordens existentes ficam intactas e novas paradas são anexadas | Testes de integração do endpoint e verificação da sequência nas duas telas de mapa |
| Abrir planejamento com snapshots locais antigos | Nenhum rascunho entra na agenda antes da confirmação explícita | Teste de migração no navegador com estado local legado |
| Concluir uma parada e abrir “Ver rota no mapa” após recarregar | A parada atendida migra para “Concluídas”; as pendentes mantêm `routeOrder`; o mapa mostra a mesma data e sequência | Integração com três paradas e navegação manual |
| Falhar o cálculo de rota viária | Pontos e números permanecem e há aviso explícito sobre indisponibilidade do trajeto pelas ruas | Simulação de falha do provedor no navegador |
| Abrir lista mensal, trocar mês rapidamente e abrir data por URL | Só resumos são carregados na lista, respostas antigas são descartadas e o link abre a rota correta após recarga | Teste de API/utilitário e cenário de navegador com Network |
| Salvar duas datas, repetir seleção e editar rota vazia em paralelo | As datas são independentes, repetição não duplica parada e a primeira seleção por usuário/data é serializada | Integração com MongoDB em replica set descartável |

## Ordem de entrega

1. Confirmar URL e contratos de agendamento; registrar a API diária no backend antes de conectar o fluxo do frontend.
2. Consolidar lista mensal, rota por data, salvamento automático e carregamento sob demanda, preservando execução de poda, histórico e rotas antigas.
3. Centralizar o tema no ponto de entrada e revisar navegação, formulários, mapas e estados nos dois temas.
4. Validar API, integração com MongoDB, testes do frontend e cenários do navegador. Em homologação, disponibilizar primeiro schema/API e validar contratos antes do frontend.
