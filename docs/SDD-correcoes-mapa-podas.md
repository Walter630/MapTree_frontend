# SDD — Análise no mapa e navegação do registro de podas

## Objetivo

Abrir a análise da árvore diretamente ao ativar seu marcador, apresentar risco registrado e previsão com estados distintos, revisar localização em formulário responsivo e encaminhar o registro de poda para o histórico correto de cada perfil.

## Regras e contratos

- Clique, toque e teclado no marcador individual abrem o painel de análise para Admin, Gestor e Funcionário. O painel consulta `GET /trees/:id` e a previsão existente; respostas de uma árvore anterior ou de um painel fechado não atualizam a seleção atual.
- O risco operacional e a classificação persistida aparecem antes da previsão. `TO_PRUNE` deve ser mostrado como **Poda necessária**, inclusive quando a previsão está indisponível. Falha de consulta e ausência de previsão são estados distintos.
- As estimativas são apoio à vistoria. O painel conserva endereço, coordenadas, solo e poda mais recente. **Registrar poda desta árvore** continua disponível; **Editar localização** segue a autorização existente de Gestor e Funcionário autor.
- A edição reutiliza `GET /trees/:id`, `PATCH /trees/:id/location` e `GET /trees/:id/location-history`, enviando `expectedUpdatedAt` e endereço no mesmo payload. Conflito mantém o rascunho e permite reler a versão atual; cancelamento restaura o marcador e sucesso atualiza o mapa e a rota diária.
- A conclusão só aparece após a API confirmar o registro. O histórico deve refletir árvore, tipo e data. Quando houver parada pendente correspondente, a conclusão da parada cria o registro vinculado sem uma segunda poda avulsa.
- A tela de cadastro e o botão de sucesso usam rotas nomeadas por perfil: `AdminPruningList`, `ManagerPruningList` e `PruningList`; os links de painel e rota diária também usam nomes de rota.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
|---|---|---|
| Ativar marcador por clique, toque ou teclado em cada perfil | Abre a análise da árvore ativada; não mostra atalhos antigos de rota ou “Ver IA” | Playwright com API simulada; navegação manual em homologação |
| Previsão disponível, ausente ou com falha | Carregamento, ausência e falha são distinguíveis; classificação registrada permanece visível | Playwright e consulta à API de homologação |
| Trocar árvore ou fechar painel durante consulta | Resposta atrasada não substitui nem reabre a seleção | Playwright com resposta atrasada |
| Editar localização em claro/escuro e desktop/celular | Rótulos, campos, endereço, contador, posição anterior e ações permanecem legíveis e alcançáveis | Playwright em viewports e temas distintos; API real para gravação |
| Salvar, cancelar, conflito ou falha de rede | Endereço e coordenadas persistem juntos; cancelar restaura; conflito oferece recarga; falha preserva rascunho | Playwright simulado e integração em banco descartável |
| Registrar poda avulsa e vinculada | Sucesso só após resposta; histórico persiste árvore, tipo e data; parada vinculada fica concluída sem duplicação | Playwright simulado e integração em banco descartável |
| Navegar para histórico por perfil | Cada perfil chega à rota nomeada e permitida | Teste unitário e Playwright para Admin, Gestor e Funcionário |

## Ambiente de validação

Os testes simulados confirmam os estados de interface e as chamadas esperadas, mas não substituem a validação de autorização, isolamento entre empresas, município, versão concorrente, auditoria e persistência no backend. A homologação real requer site e backend ligados a banco descartável com contas das duas empresas e os perfis descritos na tarefa; suas credenciais não devem ser gravadas em arquivos ou evidências.
