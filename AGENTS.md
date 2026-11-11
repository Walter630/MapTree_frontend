# Instruções de engenharia do MapTree

Siga esta sequência em toda alteração. Use os contratos e o código do checkout em uso como evidência. Consulte o [acordo técnico](docs/engineering-working-agreement.md) para as regras de campo e de avaliação de risco.

## 1 Diagnosticar

- Confirme a raiz do repositório, a revisão em uso e as alterações locais antes de editar. Preserve o trabalho existente.
- Siga a entrada real do usuário até o resultado. Quando houver API, confira rota, payload, validação, autorização, gravação e leitura de retorno.
- Em correções, reproduza o problema e registre o resultado observado. Se o ambiente impedir a reprodução, indique o que ficou em aberto e fundamente a hipótese com evidência do código ou dos testes.

## 2 Especificar e planejar

- Antes de editar, defina o comportamento esperado em termos verificáveis. Para ajustes pequenos, basta uma descrição curta na tarefa. Para mudanças de contrato, autenticação, permissões, persistência ou fluxo entre serviços, crie ou atualize a especificação em `docs/`, seguindo o padrão `SDD-*.md`.
- Registre objetivo e escopo, regra de negócio, telas e contratos afetados, dados legados, falhas previsíveis e critérios de aceite. Para cada critério, indique cenário, resultado esperado e como verificá-lo.
- Ordene a execução pelas dependências. Em mudanças entre frontend e API, confirme primeiro o contrato. Defina como lidar com gravações parciais, repetição, concorrência e reversão quando aplicável.

## 3 Implementar

- Faça a menor alteração que cumpre a especificação no fluxo real. Reutilize componentes, validações e contratos existentes. Preserve o comportamento dos outros fluxos e o suporte aos registros anteriores.
- Valide entradas e permissões no servidor, inclusive por recurso e organização quando a regra exigir. Proteja credenciais, tokens e dados pessoais em código, logs e evidências.
- Mostre carregamento, vazio, erro e sucesso coerentes com o resultado da API. Em formulários, preserve os dados após falhas recuperáveis. Em operações com gravação, confirme o sucesso com base na resposta persistida.

## 4 Revisar o diff

- Leia o diff inteiro antes de concluir. Compare cada alteração com a especificação. Confira chamadas, tipos, tratamento de erros, efeitos fora do escopo e compatibilidade com registros antigos.
- Para login e permissões, teste a API com acesso anônimo e perfis sem autorização, conforme o recurso. Para gravações, verifique falha, reenvio e concorrência quando aplicável. Para telas, verifique teclado, foco, leitura de mensagens e uso em celular quando afetado.
- No MapTree, mantenha o registro de poda separado da classificação de risco. Use medições e regras de vistoria para a avaliação. Use previsões como apoio à priorização em campo.

## 5 Verificar e entregar

- Reexecute o cenário original e os critérios de aceite. Use teste unitário para regras isoladas, integração para contratos e gravação e navegador para fluxos de interface. Acrescente teste de regressão quando a cobertura existente deixar escapar a falha.
- Ao alterar código do frontend, execute os testes relevantes (`npm run test:unit -- --run`, com filtro quando adequado) e a checagem de tipos (`npm run type-check`). Aplique lint sem correção automática e rode `npm run build` quando a mudança afetar o aplicativo ou sua configuração. Para sessão e fluxos reais, use `npm run test:session` conforme o [roteiro do navegador](docs/session-browser-tests.md).
- Em homologação, use contas de teste e banco descartável para cenários que gravam dados. No login Google, valide o primeiro vínculo e o retorno em um novo contexto de navegador. Na poda, confira a data persistida, o histórico e o mapa após recarregar. Identifique quando a API, o banco ou um provedor externo foi simulado.
- Marque como validado apenas quando os critérios aplicáveis passarem. Corrija regressões causadas pela mudança e repita a verificação. Na entrega, informe o que mudou, quais testes executou e seus resultados. Registre verificações pendentes, o motivo e o próximo passo.
