# Medição de campo no mapa

A altura medida da árvore e a largura da copa ficam no histórico de medições. O painel de IA exibe estimativas separadamente. A altura de referência da fiação é fornecida pela API conforme o tipo de local e aparece identificada como referência.

## Fluxo

1. Abrir uma árvore real no mapa e consultar `GET /trees/:id` para obter medições, referência da fiação e classificação calculada pela API.
2. Em **Registrar medição**, informar altura e largura da copa em metros. Aceitar separador decimal por vírgula ou ponto. Exigir altura positiva e largura não negativa informada.
3. Enviar `POST /measurements` com `treeId`, `height` e `canopyWidth`. A data é gerada no servidor. Confirmar com a resposta e consultar novamente os detalhes para atualizar a classificação no mapa. Se a leitura falhar após a gravação, manter a medição confirmada na tela e indicar a falha de atualização.

## Critérios de aceite

- Sem previsão de IA, ainda é possível consultar e registrar uma medição real.
- Uma resposta de sucesso atualiza os valores exibidos. Após recarregar, a medição é obtida da API. Em caso de falha de gravação, os campos ficam disponíveis para correção e nova tentativa.
- Referência de fiação ausente permanece indisponível. O formulário não pede uma medição física da fiação nem converte estimativas da IA em medições.
- A consulta de podas continua autenticada. Se a sessão não puder ser renovada, a interface informa que é necessário entrar novamente.

## Medição inicial no cadastro da árvore

### Objetivo e escopo

Permitir que quem cadastra uma árvore informe, no mesmo formulário, a altura e a largura da copa medidas em campo. A medição entra no histórico como qualquer outra, sem alterar `POST /trees`. Fora de escopo: previsões de IA, classificação de risco e edição de medições já gravadas.

### Contrato

- `POST /trees` não recebe medidas. Devolve a árvore criada, com `id`.
- `POST /measurements` recebe `treeId`, `height` e `canopyWidth` (ambos obrigatórios e numéricos). A data é gerada no servidor.
- Por isso o cadastro com medição são duas gravações em sequência: primeiro a árvore, depois a medição com o `id` devolvido.

### Regras

- A seção é opcional. Se nada for preenchido, o fluxo atual não muda: uma única chamada a `POST /trees`.
- Altura e largura da copa são enviadas juntas. Se apenas uma estiver preenchida, o formulário bloqueia o envio e indica o campo que falta. O sistema não preenche o valor ausente nem usa zero como substituto.
- Aceitar vírgula ou ponto como separador decimal. Altura maior que zero. Largura da copa maior ou igual a zero.
- A medição só é considerada gravada quando a resposta traz `id` e `treeId` iguais aos esperados.

### Falhas previsíveis

| Situação | Comportamento |
| --- | --- |
| `POST /trees` falha | Nada foi gravado. Os campos permanecem preenchidos para correção e nova tentativa. |
| Árvore gravada e `POST /measurements` falha | A árvore existe. Os dados da árvore não são reenviados. A tela avisa que a medição não foi salva, mantém altura e largura e oferece **Tentar salvar a medição novamente**, que repete apenas `POST /measurements`. |
| Árvore gravada e a resposta não traz `id` | Não há como vincular a medição. A tela informa que a árvore foi cadastrada e orienta a usar **Registrar medição** no mapa. |
| Sessão expirada na segunda gravação | Mesmo tratamento da falha da medição, com a mensagem de sessão expirada. |

Limite conhecido: se a primeira tentativa da medição chegar ao servidor e a resposta se perder, uma nova tentativa cria uma segunda medição para a mesma árvore. O histórico preserva as duas, com data, e a mais recente prevalece na leitura.

### Critérios de aceite

1. Cadastro sem medição: uma chamada a `POST /trees`, sem chamada a `POST /measurements`.
2. Cadastro com altura `5,2` e largura `2,4`: `POST /trees` seguido de `POST /measurements` com `{ treeId: <id devolvido>, height: 5.2, canopyWidth: 2.4 }`, e mensagem de sucesso após as duas.
3. Apenas altura ou apenas largura preenchida: nenhuma chamada à API e mensagem no campo que falta.
4. Altura `0`, negativa ou texto: nenhuma chamada à API.
5. Falha em `POST /measurements` depois de `POST /trees`: a árvore não é enviada de novo, a tela mostra o aviso com a ação de nova tentativa, e a nova tentativa envia só a medição.
6. Após a nova tentativa bem-sucedida, o aviso some e a confirmação é exibida.

### Cartão "Medição de campo" no mapa

O cartão mostra altura medida e largura da copa como valores em destaque, com a data da medição. A referência da fiação aparece como informação separada, identificada como referência da API, ou como "indisponível". O cartão não compara a altura medida com a referência nem sugere que a árvore está segura ou em risco; a classificação continua sendo calculada pela API.
