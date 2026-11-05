# Acordo de trabalho técnico — MapTree

Estas preferências orientam as próximas alterações neste repositório e foram registradas a pedido do usuário.

## Como planejar e implementar

- Atuar com rigor de engenharia sênior: entender o fluxo existente, os contratos de API, os estados de erro e os impactos antes de mudar código.
- Para trabalho com escopo relevante, criar/atualizar SDD antes de implementar e explicitar suposições e decisões pendentes.
- Pesquisar documentação oficial e fontes confiáveis antes de recomendar tecnologia, padrão, modelo ou biblioteca; preferir o que o projeto já usa quando atende ao requisito.
- Em frontend, considerar responsividade, acessibilidade, estados de carregamento/vazio/erro, dados faltantes, entradas malformadas, desempenho e consistência visual.
- Evitar introduzir dependências sem benefício claro e medido.
- Ensinar de forma breve o que mudou e por que, sem esconder limitações ou apresentar hipótese como fato.

## Como validar

- Toda mudança deve receber testes proporcionais aos riscos e às regras alteradas.
- Rodar testes relevantes, type-check e build/lint quando aplicáveis; reportar exatamente quais comandos rodaram e seus resultados.
- Investigar falhas encontradas, corrigir as causadas pela mudança e distinguir problemas preexistentes/fora do escopo.
- Não afirmar que algo foi validado sem executar a validação correspondente.

## Segurança operacional do MapTree

- Funcionalidades de proximidade de árvores e rede elétrica são apoio à priorização e inspeção. Nunca inferir que um trabalho é seguro só por uma predição de software.
- Previsões dependem de medições com unidade, data, proveniência, incerteza e validação profissional; ausência ou desatualização crítica precisa degradar para estado explícito de “sem previsão confiável/precisa vistoria”.
- Antes de propor predição de IA, revisar dados e definir horizonte, variável-alvo, limiares aprovados, validação temporal/geográfica, falsos negativos e monitoramento.
