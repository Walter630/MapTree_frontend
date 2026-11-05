# SDD — Visualização de detalhes no histórico de podas

**Status:** rascunho para revisão do produto  
**Área:** frontend — rota `/user/podas`  
**Implementação relacionada:** `src/pages/PruningList.vue`  
**Última revisão:** 2026-11-04

## 1. Resumo

Este documento especifica como uma pessoa consulta um registro de poda a partir do histórico. Na tabela da rota `/user/podas`, o botão com ícone de olho abre os detalhes do registro selecionado.

O frontend atualmente recebe o tipo da poda e um texto de observações. Não há evidência no contrato usado pela tela de uma lista de ações/eventos com autor, horário ou estado. Portanto, esta especificação trata “ações feitas” como as informações efetivamente registradas no item: tipo e observações. Uma trilha de auditoria é uma necessidade separada e depende de contrato/backend.

## 2. Problema e objetivo

### Problema

O botão de olho da tabela não tinha comportamento funcional; o handler apenas escrevia o item no console. A pessoa não conseguia consultar o registro selecionado pela interface.

### Objetivo

Permitir a consulta rápida e legível dos dados disponíveis de uma poda sem sair da listagem.

### Não objetivos

- Criar, editar ou excluir podas pelo diálogo.
- Inventar ações, responsáveis ou datas que não estejam na resposta da API.
- Criar histórico de alterações/auditoria no frontend.
- Alterar o cadastro de poda ou o contrato atual da API.

## 3. Usuários e cenário principal

**Usuário:** pessoa autenticada que acessa `/user/podas`.

**Cenário:** a pessoa encontra uma linha no histórico, clica no olho, consulta os detalhes daquele registro e fecha o diálogo para voltar à tabela.

## 4. Estado atual observado no código

- `PruningList.vue` busca a coleção com `GET /pruning` ao montar a página.
- A tabela mostra árvore, coordenadas, tipo, data, observações e o botão de detalhes.
- `PruningRegistration.vue` cria registros com `POST /pruning`, enviando `idTree`, `type`, `date` e `observations`.
- Os tipos conhecidos na interface são `LIGHT`, `MODERATE` e `HEAVY`.
- A tabela já espera uma relação `tree` na resposta para nome da espécie e coordenadas.
- O estado de carregamento usa um cartão `v-if`; o cartão da tabela é seu `v-else` imediato. Outros elementos, como o diálogo, precisam ficar fora do intervalo entre esses dois irmãos para preservar a compilação do template Vue.

## 5. Requisitos funcionais

### RF-01 — Abrir detalhes

Ao ativar o botão de olho em uma linha, a interface deve selecionar o objeto daquela linha e abrir o diálogo de detalhes.

### RF-02 — Mostrar informações disponíveis

O diálogo deve apresentar:

- nome comum da espécie, quando disponível;
- identificador abreviado da árvore como alternativa;
- tipo de poda em texto legível;
- data formatada para pt-BR;
- latitude e longitude, quando ambas existirem;
- texto de observações, quando preenchido.

### RF-03 — Ausência de dados opcionais

Campos opcionais devem ter fallback compreensível. Coordenadas ausentes são apresentadas como “—”. Observações ausentes ou em branco devem informar que nenhuma ação/observação foi informada no registro.

### RF-04 — Fechar detalhes

O diálogo deve fechar pelo botão de fechar no cabeçalho e pelo botão “Fechar”.

### RF-05 — Preservar a listagem

Fechar o diálogo deve manter a pessoa na rota e na tabela carregada, sem nova requisição.

## 6. Requisitos não funcionais

- **Idioma:** textos da funcionalidade em português.
- **Consistência:** usar os rótulos e funções de tipo/data já presentes na listagem.
- **Resiliência:** não falhar se `tree`, espécie, coordenadas ou observações forem nulos/ausentes.
- **Acessibilidade básica:** botão de fechamento do cabeçalho tem nome acessível; controles permanecem operáveis pelo teclado conforme os componentes Vuetify.
- **Manutenibilidade:** usar os dados já carregados pela tela, evitando uma segunda consulta sem necessidade comprovada.

## 7. Dados e contrato

### Entrada conhecida para criação

```ts
{
  idTree: string,
  type: string,
  date: string,
  observations: string
}
```

### Campos consumidos na listagem/detalhes

```ts
{
  id?: string,
  idTree?: string,
  type?: string,
  date?: string,
  observations?: string,
  tree?: {
    latitude?: number,
    longitude?: number,
    species?: { commonName?: string }
  }
}
```

Este formato descreve somente o subconjunto que a tela consome; não substitui um contrato oficial do backend.

### Conceito ainda não suportado: ações como eventos

Se “ações feitas” significar uma sequência auditável, o backend precisará definir e fornecer dados como ação, autor, data/hora e ordenação. O frontend não deve inferir essa sequência a partir de `observations`.

## 8. Fluxos e estados da interface

1. **Carregando:** exibe indicador enquanto `GET /pruning` está pendente.
2. **Lista carregada:** apresenta tabela ou estado vazio nativo do componente.
3. **Detalhes abertos:** apresenta o registro escolhido em um diálogo; os detalhes usam valores do item selecionado.
4. **Detalhes fechados:** retorna à tabela sem descartar a lista.
5. **Falha de carregamento:** exibe snackbar com mensagem de erro disponível ou fallback.

## 9. Regras de apresentação

- Tipos conhecidos: `LIGHT` → “Leve”; `MODERATE` → “Moderada”; `HEAVY` → “Pesada”. Valores não conhecidos são apresentados sem tradução inferida.
- A data usa formatação `pt-BR` já existente na página.
- Coordenadas só são exibidas quando latitude e longitude existem; a renderização deve aceitar coordenada `0` como válida.
- Observações são texto simples, preservando quebras de linha quando renderizadas no detalhe.
- O ícone de olho corresponde à linha clicada, não a um registro inferido por ID parcial.

## 10. Critérios de aceite

1. A aplicação compila o template Vue sem erro de `v-else` sem `v-if` adjacente.
2. Clicar no olho abre o diálogo com o mesmo registro da linha.
3. O detalhe mostra tipo, data, árvore e observações disponíveis.
4. A falta de espécie, localização ou observações não causa erro de renderização.
5. O usuário consegue fechar o diálogo pelos dois controles previstos.
6. A tabela continua disponível após fechar o diálogo.
7. Nenhuma trilha cronológica ou dado não fornecido pela API é apresentado como fato.

## 11. Dependências, riscos e limitações

- A qualidade do detalhe depende dos campos presentes em `GET /pruning` e da relação `tree` retornada pelo backend.
- Se o endpoint não popular `tree`, nome e coordenadas não estarão disponíveis; será necessário confirmar o contrato ou buscar os dados de árvores separadamente.
- O campo `observations` é livre e não estruturado. Ele não permite separar de forma confiável várias ações, autores ou horários.
- O cálculo de “pendentes” e “concluídas” na tela usa uma regra simplificada baseada em `HEAVY`; esta especificação não altera nem valida essa regra de negócio.

## 12. Plano de implementação

1. Manter o carregamento e a tabela existentes.
2. Criar estado local para o item selecionado e visibilidade do diálogo.
3. Trocar o handler de console por seleção do item e abertura do diálogo.
4. Apresentar somente os campos documentados, com fallback para opcionais.
5. Manter diálogo fora da adjacência obrigatória entre o `v-if` de loading e o `v-else` da tabela.
6. Executar a compilação/type-check do projeto após as alterações.

## 13. Direção visual e robustez

- A identidade visual do detalhe usa um cabeçalho verde profundo com acento MapTree, cartões de informação e seção de ação com fundo suave; a superfície não é um bloco branco sem hierarquia.
- O diálogo usa Vuetify já presente no projeto, é rolável e reorganiza os cartões em telas estreitas.
- O nome popular da espécie é o identificador humano principal no detalhe; o nome científico complementa a identificação. O ID interno completo não deve ocupar o lugar do nome da árvore/espécie no diálogo.
- Coordenadas precisam aceitar zero e recusar `NaN`/tipos inesperados; datas malformadas precisam de fallback explícito.
- Textos opcionais devem ter fallback. Conteúdo de observações deve preservar quebras de linha e quebrar strings longas sem estourar o layout.
- Estados vazios e de erro da API continuam explícitos.
- Validar o fluxo com testes de componente e também com build/type-check.

Ver o acordo persistente de processo em [`engineering-working-agreement.md`](./engineering-working-agreement.md) e a descoberta futura de previsão em [`AI-predicao-risco-arvores.md`](./AI-predicao-risco-arvores.md).

## 14. Alterações desta revisão

- O botão de olho abre detalhes redesenhados com árvore, tipo, data, localização, identificação e observações.
- Coordenadas `0` são aceitas; coordenadas inválidas/ausentes não são formatadas.
- Datas inválidas e valores de árvore/observação ausentes têm fallbacks em português.
- O diálogo foi mantido fora da adjacência `v-if`/`v-else` da área de carregamento e da tabela.
- Foram adicionados testes de componente cobrindo detalhes, dados ausentes/malformados e erro de carregamento.
- `npx vitest run src/pages/__tests__/PruningList.spec.ts`: 3 testes passaram.
- `npm run build`: passou (inclui type-check e bundle de produção).
- `npx eslint src/pages/PruningList.vue src/pages/__tests__/PruningList.spec.ts`: passou.

## 15. Decisões pendentes para revisão

Antes de expandir a funcionalidade, confirmar o significado desejado para “ações feitas”:

1. O detalhe atual do registro (tipo + observações) atende, ou é necessária uma linha do tempo de várias ações?
2. Quais campos devem aparecer no detalhe (por exemplo, responsável, status, fotos, materiais ou equipe), e a API já os retorna?
3. O diálogo é o formato desejado, ou a consulta deve abrir uma página própria?
4. Coordenadas devem permanecer como texto ou virar um link/ação para localizar a árvore no mapa?

As decisões acima alteram escopo e podem exigir mudanças no contrato do backend; o SDD deve ser atualizado antes de ampliar o código.
