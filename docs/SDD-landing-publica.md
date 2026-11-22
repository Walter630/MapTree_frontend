# Landing pública do MapTree

## Objetivo e escopo

Apresentar o produto e orientar visitantes à solicitação de acesso na rota `/`. Login e cadastro pertencem à aplicação, usando `/login` e `/cadastro` no subdomínio `app` em produção. A landing não consulta a API quando aberta sem sessão.

## Navegação

- Marca MapTree no canto esquerdo.
- Links Como funciona, Funcionalidades e Sobre.
- Ações Entrar e Solicitar acesso.
- Em telas pequenas, menu expansível acessível por toque e teclado, com estado `aria-expanded`, foco visível e fechamento por Escape.

## Conteúdo

### Abertura

**Título:** Gestão de árvores para planejar podas preventivas.

**Descrição:** Cadastre, mapeie e acompanhe as árvores da sua região. O MapTree reúne localização, espécie e histórico de manutenção para apoiar decisões, organizar equipes e acompanhar o manejo da vegetação.

- Solicitar acesso abre `/cadastro`.
- Conhecer funcionalidades leva a `#funcionalidades`.
- Usar foto contextual e prévia ilustrativa baseada nos painéis do produto, identificada como demonstrativa.

### Propósito

**Título:** A prevenção começa com informação organizada.

A vegetação próxima às redes elétrica e de telecomunicações, às vias públicas e às construções exige acompanhamento contínuo. Galhos e árvores sem monitoramento adequado podem contribuir para interrupções de serviços, danos à infraestrutura e riscos para trabalhadores e população. O MapTree organiza os dados da cobertura arbórea para apoiar a identificação de prioridades e o planejamento de podas preventivas, além de registrar o trabalho realizado pelas equipes.

### Como funciona

1. **Cadastre** — Registre as árvores com localização, espécie e informações de manutenção.
2. **Acompanhe** — Consulte o inventário e visualize os registros no mapa da região atendida.
3. **Planeje** — Organize prioridades e rotas para as atividades de campo.
4. **Registre** — Acompanhe podas e mantenha o histórico das ações realizadas.

### Funcionalidades

- **Inventário de árvores:** Centralize os registros e consulte as informações de cada árvore.
- **Mapeamento por região:** Visualize os dados da área atendida pela empresa em um mapa interativo.
- **Histórico de manutenção:** Acompanhe as atividades, seus responsáveis e as pendências de atendimento.
- **Gestão de equipes:** Organize o acesso de gestores e funcionários e acompanhe a execução das atividades.
- **Planejamento de rotas:** Reúna as árvores que precisam de atendimento e organize a sequência das paradas.
- **Indicadores:** Consulte informações do inventário e das atividades para acompanhar a operação.

### Evolução analítica

Recursos de priorização e recomendação de período de poda são apresentados como **Em desenvolvimento**. A evolução prevê usar histórico de manutenção, características das espécies, condições ambientais e dados geográficos, com avaliação em dados reais de cada região.

### Público e chamada final

Informações organizadas para concessionárias, prefeituras, órgãos ambientais e equipes que atuam no manejo da vegetação.

A chamada final convida a solicitar acesso e explica que a equipe analisará a solicitação e definirá o vínculo com a empresa.

## Demonstrações e dados

- A prévia de rota mantém três árvores fictícias, estado inicial de 1/3 concluídas e controles para simular e reiniciar a demonstração.
- A prévia do mapa identifica desenhos, medições e referências como ilustrativos. Não representa uma medição real nem determina segurança de rede.
- A página anônima não consulta perfil, inventário, agenda ou qualquer endpoint de API; os estados demonstrativos são locais e não persistem.

## Estilos e acessibilidade

- Usar Tailwind CSS v4 com prefixo `tw:` nas estruturas ajustadas. Não aplicar Preflight global enquanto outras rotas ainda usam Vuetify.
- Manter as fontes, cores e assets de marca do projeto.
- Validar foco, contraste, toque e navegação por teclado. Respeitar `prefers-reduced-motion`.
- Conferir em 320, 390, 768, 1.024 e 1.440 px, além de zoom 200% e textos longos.

## Critérios de aceite

| Cenário | Resultado esperado | Verificação |
| --- | --- | --- |
| Landing anônima | Copy, prévia demonstrativa e CTAs conforme especificação, sem chamadas à API | Playwright e inspeção |
| Navegação desktop | Como funciona, Funcionalidades, Sobre, Entrar e Solicitar acesso funcionam | Playwright |
| Navegação móvel | Menu abre por toque, funciona pelo teclado, fecha com Escape e mantém foco | Playwright e inspeção |
| Funcionalidades | Seis recursos descritos e coerentes com telas existentes | Revisão de código e navegador |
| IA | Recursos preditivos identificados como em desenvolvimento | Inspeção visual |
| Responsividade | Sem rolagem horizontal nos tamanhos definidos | Playwright |
| Demonstração | Progresso, paradas, mapa e reinício permanecem sincronizados | Playwright |

## Dependências pendentes

A responsável orientou publicar depois os destinos oficiais de suporte, termos e política de privacidade. Até a confirmação, a landing não inventa e-mails/URLs e apresenta esses destinos como pendentes.
