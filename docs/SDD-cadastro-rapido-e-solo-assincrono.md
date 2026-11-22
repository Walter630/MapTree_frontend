# Cadastro rápido de árvore e enriquecimento de solo

## Objetivo

Permitir que a equipe registre várias árvores sem sair do mapa e sem esperar pela consulta externa de solo. O cadastro completo continua disponível para atributos operacionais e medições.

## Fluxo de campo

- A equipe escolhe uma espécie, toca no mapa e confirma cada coordenada com “Salvar e continuar”.
- Após confirmação HTTP, o novo marcador entra no estado local sem recarregar o inventário. A última espécie permanece selecionada; o ponto é limpo para o próximo cadastro.
- Falha de rede preserva ponto e espécie na tela. A mesma tentativa usa a mesma chave de idempotência; mudar os dados gera outra chave.
- O cadastro completo mantém suas validações e grava árvore e medição em chamadas separadas. A barra mostra 50% após a árvore e 100% quando a medição é confirmada. Falha na medição preserva a opção de reenviar somente a medição.

## Contrato de gravação

- `POST /trees` exige autenticação e `Idempotency-Key` com até 128 caracteres.
- A chave é exclusiva por `userId`. O servidor calcula o hash do payload; a repetição com os mesmos dados devolve a árvore persistida. Reusar a chave com payload diferente retorna `409`.
- Uma transação MongoDB cria a árvore, o registro de idempotência e o trabalho de solo. A resposta só é enviada após o commit e inclui `soilStatus: PENDING`.
- O endpoint não aguarda SoilGrids. O mapa indica “Solo em processamento” enquanto o resultado está pendente.

## Fila de solo

- `TreeSoilEnrichmentJob` mantém status, tentativas, próximo horário, lease e último erro resumido.
- O worker consulta a fila com concorrência local limitada a duas árvores e reivindica cada trabalho com atualização condicional para permitir múltiplas instâncias.
- Uma lease vencida permite recuperar trabalhos após reinício. Falhas recebem até cinco tentativas com espera exponencial limitada a uma hora; depois ficam em `FAILED` para diagnóstico.
- Registros legados sem trabalho de fila não são alterados.

## Consulta compacta de proximidade

`GET /trees/nearby?lat=...&lng=...&radius=2&limit=50&compact=true` devolve apenas ID, coordenadas, status, espécie, altura medida e `distance_km`, ordenados pela distância. O modo compacto limita raio a 5 km e quantidade a 50; o modo existente preserva sua resposta.

## Falhas e implantação

- A falha do commit não cria árvore sem trabalho de solo nem chave de idempotência parcial.
- A falha de rede depois do commit permite reenvio sem duplicar o registro.
- Falha definitiva de solo não apaga nem bloqueia a árvore cadastrada.
- Antes de publicar o backend, aplicar o schema Prisma para criar os índices exclusivos de usuário/chave e árvore/trabalho. A geração local do Prisma Client não altera banco algum; `db push` não foi executado neste ambiente.
- Transações MongoDB exigem replica set, inclusive em homologação. Confirmar a configuração em um banco descartável antes do teste de ponta a ponta.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
| --- | --- | --- |
| Duplo envio ou reenvio após perda de resposta | Uma árvore; a mesma chave devolve o mesmo ID | Teste unitário e integração Mongo em replica set |
| Mesma chave com coordenada/espécie diferente | `409` sem segunda árvore | Teste unitário e integração |
| Serviço de solo indisponível | Cadastro responde após commit e tentativas ficam agendadas | Teste do worker e teste com provedor indisponível |
| Cadastro rápido em sequência | Ponto novo confirmado, espécie preservada, pino local atualizado | Navegador móvel e 100 registros em homologação |
| Medição inicial falha | Árvore fica confirmada em 50% e usuário pode reenviar só a medição | Teste do formulário e navegador |
| Consulta compacta | Resultado leve ordenado por distância, até 50 e raio máximo de 5 km | Teste de serviço e contrato HTTP |
