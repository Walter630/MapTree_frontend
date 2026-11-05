# Avaliação — manter Vue agora ou migrar para Next.js

## Recomendação

**Manter o frontend Vue atual durante as correções e integração do Google. Planejar Next.js como uma iniciativa separada quando houver tempo para migração e validação.** Popularidade por si só não é requisito técnico e não reduz o escopo da reescrita.

## Por que esta é a escolha de menor risco

- Login Google GIS é independente de framework: o navegador obtém um ID token e a API Java o valida. O endpoint `/auth/google` e as regras de identidade podem ser reutilizados em Vue ou React.
- A aplicação é um produto autenticado, centrado em mapas operacionais. Migração não adiciona SSR ao mapa interativo por si só, enquanto exige reimplementar views, roteamento, estado, layouts Vuetify, páginas, formulários e cobertura de testes.
- A dependência de interface mais evidente é Vuetify, cujo ecossistema é Vue; em React/Next seria necessário escolher e adotar outro sistema de componentes, o que aumenta o volume de mudanças visuais e de acessibilidade.
- O guia oficial de migração disponível é para aplicações **React com Vite**, não para Vue. Ele propõe uma adoção incremental, mas não converte componentes Vue em React; este projeto exigirá reescrever a interface e substituir o ecossistema de componentes.

## Quando Next.js pode valer a pena

- páginas públicas indexáveis/SEO são uma necessidade concreta;
- SSR/streaming reduz um problema medido de tempo de conteúdo em páginas relevantes;
- a equipe já padronizou React/Next e consegue manter duas arquiteturas por uma janela de migração;
- existem recursos suficientes para reproduzir e validar autenticação, permissões, mapas Leaflet, importação, acessibilidade e experiência mobile.

Se esses requisitos ainda não estão presentes, a decisão de migrar pode esperar sem bloquear o login Google nem as melhorias de operação solicitadas.

## Plano recomendado para quando chegar a hora

1. Medir a necessidade (SEO, Core Web Vitals, manutenção ou contratação) e definir critérios de sucesso antes de escolher framework.
2. Inventariar rotas, guards/perfis, stores, APIs, variáveis, plugins e componentes compartilhados.
3. Criar uma aplicação Next isolada e reutilizar a API backend; não portar lógica de auth sem revisar armazenamento de token/cookies e proteção de CSRF.
4. Migrar uma rota de baixo risco primeiro, mantendo Vue disponível.
5. Migrar login e áreas de mapa com testes de contrato, autorização, browser real e responsividade.
6. Alternar tráfego por rota, monitorar erros e só remover Vue após paridade funcional validada.

## Fontes

- [Guia oficial Next.js 14 para migração de React/Vite](https://nextjs.org/docs/14/app/building-your-application/upgrading/from-vite)
- [Guia oficial Vue sobre desempenho e arquitetura](https://vuejs.org/guide/best-practices/performance)
