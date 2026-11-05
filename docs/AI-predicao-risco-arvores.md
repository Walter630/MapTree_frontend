# Proposta técnica — previsão de risco de conflito entre árvores e rede elétrica

**Status:** descoberta inicial; não implementar nem exibir predições ainda  
**Produto:** MapTree — monitoramento de árvores próximas à rede elétrica  
**Objetivo futuro:** estimar quando uma copa pode alcançar a zona de segurança definida pela concessionária e priorizar inspeções humanas.

## Resumo executivo

Para o primeiro produto, recomendo uma abordagem híbrida e auditável, não uma “IA” opaca:

1. **Geometria e regras determinísticas** calculam distância atual entre copa/galhos e condutores usando coordenadas e medições com unidade, data e incerteza.
2. **Modelo de crescimento calibrado localmente** estima a evolução da copa/altura por espécie ou grupo de espécies e condições observadas.
3. **Camada de decisão conservadora** converte a distribuição/intervalo de previsão em faixas de prioridade, levando em conta incerteza e regras locais aprovadas por especialistas.
4. **Revisão humana e registro de resultado** mantêm a previsão como apoio operacional, não como autorização de trabalho nem substituição de avaliação arborícola/elétrica.

O projeto já declara um tipo `AiPrediction` em `src/plugins/apiConnect.ts` com altura estimada, altura do fio, dias até alcance e faixa de risco. Isso é um contrato tipado do frontend, não prova de que exista serviço, dados calibrados ou modelo validado. O plano abaixo precisa ser ajustado ao backend e aos dados reais que o usuário fornecer.

## Por que não escolher um algoritmo agora

Ainda não temos amostra, definição operacional de “alcançar o fio”, histórico de medições repetidas, latência aceitável, cobertura por espécie/local ou rótulos de eventos. Sem isso, escolher rede neural, XGBoost ou um valor fixo de crescimento seria chute. Modelos de crescimento urbano publicados usam medições de árvores e contexto ambiental; estudos também reportam desafios de prever copas junto a objetos urbanos. A escolha deve decorrer de validação temporal e geográfica em dados MapTree, não de benchmark genérico. [Estudo de crescimento urbano com modelos por árvore](https://link.springer.com/article/10.1007/s10342-023-01599-0), [estudo de modelagem de copa em ambiente urbano](https://www.gs.tum.de/fileadmin/w00bik/grk-ugi/Documents/Yazdi_et_al_-_urban_forestry_2024.pdf).

## Dados mínimos a inventariar

### Árvore e medições

- ID persistente, posição e precisão do GPS;
- espécie identificada e confiança da identificação;
- altura e largura/raio da copa, método de medição, instrumento, unidade, timestamp e incerteza;
- vigor, condição fitossanitária, forma da copa e poda/intervenções com data e tipo;
- medidas repetidas da mesma árvore para estimar crescimento individual.

### Rede elétrica e contexto

- geometria 3D dos condutores/estrutura ou posição georreferenciada com altura, unidade e data do levantamento;
- classe de tensão e zona de afastamento fornecida/validada pela concessionária responsável;
- terreno, clima/estação, solo e disponibilidade hídrica, se consistentes e atualizados;
- origem, precisão, licença e validade temporal de cada fonte.

### Alvos e resultados operacionais

- alvo de previsão explícito: distância mínima futura, altura/largura de copa ou data provável até um limiar aprovado;
- inspeção confirmatória, poda executada, falso alarme/risco não detectado e respectivas datas;
- resultado da revisão humana e justificativa de override.

Uma linha de dados deve representar uma observação datada. Evitar vazamento temporal: atributos coletados depois do instante de previsão não podem entrar como preditores daquele instante.

## Arquitetura sugerida

```text
Sensores / cadastro / inspeções
             │  validação, unidades, proveniência
             ▼
       Histórico versionado
             │
             ├── cálculo geométrico atual + qualidade da medição
             ├── baseline de crescimento por espécie/grupo/região
             └── modelo calibrado (quando houver dados suficientes)
                       │ intervalo + versão + explicações
                       ▼
              Serviço de risco versionado
                       │
          API com timestamp e validade do resultado
                       ▼
          UI: prioridade, fatores, confiança e revisão
                       │
             feedback da inspeção/poda
```

### Estratégia de modelagem em fases

**Fase 0 — qualidade de dados:** perfil de cobertura, duplicatas, unidades, medições impossíveis, lacunas, frequência e distribuição temporal/espacial. Não mostrar prazo de risco.

**Fase 1 — baseline explicável:** regras geométricas e crescimento por intervalos de espécie/região derivados de fonte agronômica/arborícola aprovada ou medições locais. Exibir intervalo conservador e “dados insuficientes” quando não houver suporte; não converter distância em risco elétrico sem os limites oficiais.

**Fase 2 — modelo supervisionado/longitudinal:** comparar regressão simples/efeitos mistos, Gradient Boosting e sobrevivência/tempo até limiar conforme volume e formato dos dados. Validar previsão de distância/altura e, separadamente, probabilidade de cruzar o limiar no horizonte. Preferir o modelo mais simples que generalize bem e possa ser explicado.

**Fase 3 — piloto assistido:** modo sombra, previsões invisíveis ao despacho; revisão por arboristas e equipe elétrica; medir erros e carga de inspeção; então habilitar apenas com protocolo de operação e monitoramento aprovados.

## Avaliação e prevenção de falhas

- Dividir treino/teste por tempo e por região/árvore, evitando observações da mesma árvore nos dois lados quando isso inflar desempenho.
- Comparar com baseline simples e inspeção atual; avaliar MAE/RMSE para grandezas contínuas, calibração e recall/precision na faixa prioritária.
- Para segurança operacional, medir falsos negativos no limiar crítico e intervalos de incerteza; uma média de erro baixa não basta.
- Reportar métricas por espécie, região, estação, qualidade de sensor e distância da rede; identificar grupos sem cobertura.
- Medir drift, idade da última medição, dados ausentes e mudanças de método. Expirar/ocultar predição velha ou baseada em medição incompatível.
- Registrar versão do modelo, instante de inferência, variáveis usadas, proveniência, resultado, motivo de override e mudança de limiar.
- Fail safe: se dado crítico estiver ausente, inconsistente ou desatualizado, mostrar “necessita vistoria / sem previsão confiável”, nunca “baixo risco”.
- Um alerta de software não define distância segura de trabalho. Valores e procedimentos devem vir da concessionária e de profissionais habilitados. A ISA descreve requisitos específicos para trabalho arborícola com risco elétrico; validar normas aplicáveis locais antes de operacionalizar. [ANSI Z133 / ISA](https://www.isa-arbor.com/Portals/0/Assets/PDF/research/Z133_2024_Clean1.pdf?ver=2023-07-18-110702-663).

## Contrato de API futuro (rascunho, não implementado)

```ts
interface TreeRiskPrediction {
  treeId: string
  predictedAt: string
  validUntil: string
  horizonDays: number
  currentClearanceM?: { value: number; uncertainty: number }
  predictedClearanceM?: { p10: number; p50: number; p90: number }
  probabilityOfThresholdCrossing?: number
  operationalPriority: 'ROUTINE' | 'INSPECT' | 'URGENT' | 'UNAVAILABLE'
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  reasonCodes: string[]
  missingInputs: string[]
  model: { name: string; version: string }
  reviewedByProfessional?: boolean
}
```

O limiar crítico e o cálculo de probabilidade são definidos por domínio/backend após aprovação técnica; o frontend apenas apresenta o resultado recebido e a validade. Evitar campos como `willReachWire` sem horizonte temporal e sem incerteza.

## UX proposta quando existir previsão validada

- Mostrar distância atual medida, data e método da medição antes de previsão futura.
- Mostrar horizonte e intervalo, não apenas um número de “dias até o fio”.
- Apresentar fatores que elevaram prioridade, qualidade/idade dos dados e versão/data do cálculo.
- Usar estados distintos para “sem dados”, “dado desatualizado”, “previsão indisponível” e “revisão recomendada”.
- Rotular como apoio à priorização; não indicar que a situação é segura para execução.
- Registrar ações/resultado para fechar o ciclo de feedback.

## Testes necessários antes de produção

- validação de esquema, unidade, coordenadas, timestamps e valores de medição;
- testes de geometria para limites, unidade e erro de precisão;
- testes temporais contra baseline e holdout geográfico;
- calibração e cenários de valores extremos, espécies não vistas e medições antigas;
- API: validade, versão, indisponibilidade e dados incompletos;
- UI: cada estado, incerteza, texto acessível e ausência de falso sinal de segurança;
- monitoramento de métricas e alertas de drift após piloto.

## O que o usuário pode enviar para avançar

1. Exemplo real (anonimizado) de cadastro/medições de árvore e estrutura de rede, incluindo unidades e datas.
2. Definição do que “galho próximo” ou “alcança a fiação” significa no processo de vocês e quem aprova os limites.
3. Amostra de podas/inspeções com motivo, data e resultado observado.
4. Documentação ou payload atual da API, especialmente o objeto `aiPrediction` já tipado no frontend.
5. Cobertura geográfica, frequência de atualização e volume aproximado de registros.

Com esses dados, o próximo passo é um perfil exploratório e um plano de validação; só então selecionar algoritmo, limiares e arquitetura de produção.
