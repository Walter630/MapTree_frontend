# Empresa, município e endereços públicos da aplicação

## Objetivo e estado atual

Associar cada empresa a um único município oficial, limitar o inventário ao escopo da empresa e ao limite municipal, e separar a landing pública da aplicação autenticada.

O checkout local contém alterações para autoria e isolamento de árvores por empresa, edição pelo responsável, criação idempotente, landing pública e migração gradual para Tailwind. Nesta etapa, `Organization` passou a aceitar código IBGE, UF, nome e geometria GeoJSON; a API exige um limite válido para gravações geográficas de funcionários/gestores e recorta as consultas de mapa, proximidade, cidades e estatísticas. A geometria é guardada por empresa e não foi carregada para nenhuma empresa real.

`Region` continua contendo retângulos aproximados. Os testes municipais usam polígonos sintéticos. A migração Prisma foi gerada localmente, sem aplicar alterações ao banco; os dados existentes e o limite oficial de cada empresa ainda precisam ser configurados e conferidos. Essas mudanças não estão publicadas nem foram verificadas contra uma API e um banco de homologação.

A landing e a aplicação ainda dependem de configuração de domínio real. O `vercel.json` local contém regras de host, encaminha `/api/*` ao backend e envia as demais rotas ao SPA. A página `/503.html` existe, mas a hospedagem não foi configurada para responder HTTP 503 em falha.

## Decisões

- Identificar o município pelo código de sete dígitos do IBGE, UF e nome oficial. Usar a Malha Municipal do IBGE como fonte da geometria e registrar o endpoint/qualidade consultados; o ano da edição da malha ainda não é identificado pela API usada. Não reutilizar os retângulos aproximados de `Region` como fronteira. [IBGE — Malha Municipal](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html)
- O gestor configura o limite no menu **Município** (`/manager/municipality`). A tela consulta a lista oficial de municípios do IBGE por UF, mostra a geometria antes de salvar e envia apenas o código IBGE ao endpoint autenticado. O backend consulta nome, UF e geometria novamente, valida a resposta oficial e salva tudo junto à empresa.
- A configuração persiste código IBGE, nome, UF, GeoJSON, URL da fonte, versão do endpoint/qualidade e instante da consulta. A UI não aceita GeoJSON livre nem cria limites aproximados.
- `PATCH /api/organizations/:orgId/municipality` é permitido a ADMIN e ao gestor ativo daquela organização; para gestor, o escopo é validado pelo `OrgScopeGuard`. O endpoint busca os dados no IBGE e não confia em nome, UF ou geometria enviados pelo cliente.
- Guardar código IBGE, UF, nome e geometria GeoJSON na empresa. A geometria deve vir da Malha Municipal oficial do IBGE; a versão usada ainda precisa ser registrada junto à configuração. O cliente informa a empresa somente para telas administrativas; a API resolve a empresa do usuário pela sessão autenticada.
- Uma conta de funcionário pode consultar árvores da sua empresa e editar as que cadastrou. O gestor pode editar as árvores da própria empresa. O servidor repete a verificação em cada leitura e gravação; dados de autoria ou empresa enviados pelo cliente não são autoridade.
- As consultas locais de mapa por risco, bounds, proximidade, cidade e estatísticas combinam escopo da empresa e polígono municipal. Árvores fora do polígono não aparecem quando estão dentro do retângulo envolvente. A rota de bounds limita a resposta a 500 marcadores; a indicação visual de truncamento, cache segregado e descarte de respostas antigas continuam pendentes.
- Cadastro e alteração de coordenadas verificam no servidor se o ponto está dentro ou na borda do polígono. Sem município/limite oficial configurado, a API não aceita gravação geográfica. Edição usa versão lida para detectar conflito e atualiza apenas campos permitidos.
- A associação de dados legados só usa evidência verificável. Registros sem vínculo confiável permanecem isolados e disponíveis para reconciliação administrativa; não são atribuídos automaticamente por proximidade ou nome.
- `www.maptree.com.br/` serve a landing pública, inclusive com sessão ativa. `maptree.com.br/` redireciona permanentemente para `www`; caminhos diferentes de `/` nos dois hosts públicos redirecionam para o mesmo caminho em `app.maptree.com.br`, preservando a consulta. O subdomínio `app` serve login e rotas da aplicação. O botão Entrar da landing aponta para `https://app.maptree.com.br/login`.
- A página estática de indisponibilidade pode ser usada pela camada que entrega o tráfego apenas se ela continuar disponível quando a API cair e puder responder HTTP 503 sem cache prolongado. Falhas isoladas de API na aplicação aberta continuam exibindo mensagens próprias da operação.

## Contratos e dados

- Município: campos opcionais `municipalityCode`, `municipalityUf`, `municipalityName` e `municipalityGeometry` na organização. Quando configurados, o código precisa ter sete dígitos, a UF duas letras e a geometria Polygon/MultiPolygon válida. O ano/versão da malha oficial ainda não tem campo persistido.
- Proveniência: `municipalityGeometrySource`, `municipalityGeometrySourceVersion` e `municipalityGeometryRetrievedAt` registram o endpoint oficial, sua versão/qualidade e quando o limite foi obtido.
- Organização: funcionário não altera a configuração; ADMIN ou gestor da própria empresa pode usar o contrato de organização existente. Sem geometria válida, as operações geográficas de funcionário/gestor falham fechadas.
- Árvore: `organizationId` e `createdById` são definidos pelo servidor. A gravação e a mudança de coordenadas validam o polígono. As consultas geográficas de mapa/cidade usam empresa e município; inventário, detalhes e exportação continuam com escopo de empresa e precisam de revisão específica para registros antigos fora do município.
- Mapa: rota de bounds retorna no máximo 500 registros, mas não informa truncamento. Ao mudar viewport, o comportamento de cancelamento/descarte de resposta e o carregamento sob demanda devem ser confirmados na interface.
- Domínios: atualizar origens permitidas de autenticação/OAuth e links de recuperação para o host real de `app`; cookies permanecem limitados ao host que os utiliza, com `Secure`, `HttpOnly` e `SameSite` compatível com o fluxo atual.
- Rotas internas continuam aceitando acesso direto e atualização da página no host `app`. Rota inexistente apresenta página 404 e não redireciona silenciosamente para a landing.

## Dados legados, falhas e reversão

- Não executar migração em produção sem backup verificado, lista de empresas com código IBGE confirmado e plano de restauração.
- Empresas sem município ficam visíveis para administração e recebem mensagem explícita até o responsável configurar o município. A política de bloqueio de cadastro/mapa deve ser confirmada em homologação antes de ativar a validação obrigatória.
- Árvores sem empresa/autoria continuam sem atribuição. A reconciliação usa auditoria e exige confirmação administrativa com evidência; nunca usar apenas coordenadas para inferir a empresa.
- Geometria inválida ou ausente falha fechada para gravação de coordenadas; consultas de dados já autorizados não ampliam o escopo municipal.
- Erros de API conservam o formato esperado pelo frontend. A página 503 não deve substituir uma resposta de erro JSON da API.
- Alterações de host, CORS, cookies, OAuth e DNS precisam de ambiente de homologação. A configuração DNS e do projeto de hospedagem não está disponível neste checkout.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
|---|---|---|
| Gestor abre Município no menu | Lista municípios oficiais por UF, pré-visualiza o polígono do IBGE e salva pela empresa da sessão | Build passou; navegação autenticada e persistência real pendentes |
| Duas empresas no mesmo município e uma em outro | Usuário recebe somente inventário da empresa e município autorizados | Teste de API com identificadores alterados e dados de teste em banco descartável — pendente |
| Ponto dentro, fora e na borda do município | Dentro e borda são aceitos; fora é recusado | Testes unitários passaram com geometria sintética; confirmar com malha oficial pendente |
| Busca por bounds, detalhe, contagem e exportação | Empresa/município não vazam em nenhuma rota | Recorte municipal de endpoints geográficos tem testes unitários; integração por perfil e revisão de detalhe/exportação pendentes |
| Autor, colega e gestor editam árvore | Autor e gestor da empresa conseguem; colega recebe 404/403 | Testes da API e fluxo de navegador |
| Alteração concorrente e repetição de cadastro | Conflito explícito e uma única árvore persistida | Teste de integração com banco descartável |
| Funcionário tenta alterar município ou empresa | Servidor recusa a operação | Teste de autorização da API |
| Landing em domínio raiz com e sem sessão | Landing pública sem consulta de perfil; Entrar abre o login no host `app` | Navegador anônimo, sessão simulada e análise de requisições |
| Rota antiga no domínio raiz e acesso direto no host `app` | Redireciona para rota equivalente e aceita refresh | Homologação com configuração real de host |
| Queda da API e queda da aplicação | API mantém JSON de erro; proxy serve página 503 com status 503 e sem cache prolongado | Simulação na hospedagem de homologação |
| Telas alteradas | 390, 768 e 1.440 px, claro/escuro, teclado e toque sem sobreposição nem rolagem horizontal | Playwright, capturas e revisão manual |

## Dependências externas e pendências

- URL de homologação, contas de teste e banco descartável: não disponíveis; o usuário confirmou que só há ambiente local. Os percursos de login, gravação real, dois clientes e isolamento entre empresas não foram executados.
- Geometrias oficiais e vínculos empresa → município: não foram fornecidos nem importados. Configurar somente com códigos e polígonos conferidos na [Malha Municipal do IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html); não inferir empresa de árvores antigas.
- Backup/restauração do banco, lista verificada empresa → município e confirmação dos vínculos legados: pendentes.
- Acesso ao projeto de hospedagem/DNS e às configurações CORS/OAuth: pendente. Não publicar nem alterar produção a partir deste checkout.
- Comportamento de indisponibilidade depende da camada de proxy/CDN que entrega a página quando o backend falha.
