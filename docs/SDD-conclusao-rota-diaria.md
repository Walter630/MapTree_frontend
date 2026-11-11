# Conclusão de paradas e visualização da rota diária

## Comportamento esperado

- A rota de navegação mostra somente as paradas pendentes, com um marcador numerado por parada. O histórico e a contagem de atendimentos mantêm as paradas concluídas. A numeração da rota existente é preservada durante a execução.
- Depois da última conclusão, o mapa volta ao inventário e a página da rota mostra “Rota concluída”. O usuário também pode sair da visualização da rota durante a execução.
- A poda avulsa conclui uma parada quando existe exatamente uma parada própria pendente para a mesma árvore e data. A tela informa essa regra antes do envio. Se houver mais de uma candidata, o usuário deve escolher a parada na rota. Registros avulsos anteriores permanecem no histórico.
- A conclusão do serviço e a classificação de risco da árvore são independentes. A árvore atendida sai da navegação e das sugestões da mesma rota. No inventário, a data da última poda e a classificação de risco continuam disponíveis.

## Contratos e sequência

1. Consultar `GET /scheduling?date=AAAA-MM-DD&mine=true` e usar a situação do servidor para distinguir paradas pendentes, concluídas e canceladas. O snapshot local representa o rascunho de planejamento. Em caso de falha nessa consulta, mostrar a falha e oferecer nova tentativa, sem orientar a navegação por dados antigos.
2. Registrar pelo `POST /scheduling/:id/complete` quando houver vínculo. Esse endpoint já registra a poda e conclui a parada na mesma transação. Usar `POST /pruning` quando o registro avulso estiver sem parada correspondente. Uma rejeição do endpoint de conclusão permanece um erro de conclusão.
3. Após sucesso, atualizar o estado da parada e o snapshot de pendências. Ao reabrir o mapa, consultar novamente a API. Uma parada concluída ou cancelada pelo servidor prevalece sobre snapshots anteriores.

## Critérios de aceite

- Com duas paradas pendentes, o mapa mostra dois marcadores numerados, sem sobreposição de marcadores de árvore nem do provedor de rotas.
- Depois de concluir a primeira, a lista indica um atendimento e o mapa oferece somente a segunda. Depois de concluir a última, a rota some do mapa de navegação e o histórico continua disponível após recarregar.
- Uma parada cancelada, uma rota toda concluída e um snapshot antigo com essas paradas não geram instruções de navegação. Em falha da API, a rota pode ser consultada novamente pelo botão de tentativa.
- Pelo formulário avulso, a parada própria correspondente é concluída com uma única gravação. Uma falha de gravação preserva o formulário e não altera a situação apresentada.
