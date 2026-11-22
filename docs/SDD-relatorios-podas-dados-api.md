# SDD: relatórios de poda baseados na API

## Objetivo

Remover séries e indicadores fictícios dos relatórios de gestor e funcionário, calculando as tendências mensais a partir dos registros retornados pela API de podas.

## Escopo e regra

- A fonte é `GET /pruning`, já consumida pelas duas telas e autorizada pelo perfil/empresa no backend.
- Manter os totais e a distribuição por tipo já derivados dos registros da API.
- O gráfico do gestor mostra os últimos 12 meses; o do funcionário, os últimos 6 meses. Contagens e alturas das barras vêm das datas retornadas pela API, usando o fuso de `America/Sao_Paulo`.
- Remover o indicador fixo de equipes ativas do relatório do funcionário, pois essa tela não possui uma fonte de API autorizada para essa métrica.
- Não alterar contrato de backend nem persistência.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
| --- | --- | --- |
| Há registros em vários meses | Cada barra mostra a contagem daquele mês retornada pela API | Teste unitário da série mensal |
| Não há registros no período | Gráfico vazio com mensagem clara e barras em zero | Teste unitário e inspeção visual |
| Gestor abre os relatórios | Total e tipos permanecem iguais ao conjunto de podas da API; gráfico mensal não varia entre carregamentos | Teste focado e inspeção da tela |
| Funcionário abre os relatórios | Gráfico usa os seis meses recentes; indicador estático de equipes não aparece | Teste focado e inspeção da tela |
