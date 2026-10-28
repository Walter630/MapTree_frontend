# Notas de segurança — MapTree Frontend

Documento informativo (FEAT-003). Não altera o mecanismo de autenticação atual;
registra riscos conhecidos e a recomendação de evolução.

## 1. Tokens de acesso em `localStorage`

### Situação atual
O token de acesso (`accessToken`) é persistido em `localStorage`
(ver `src/plugins/apiConnect.ts`: `getAccessToken` / `setAccessToken` / `clearTokens`).
O interceptor de requisição injeta o header `Authorization: Bearer <token>` a partir desse valor.

### Risco
`localStorage` é acessível por qualquer JavaScript que rode na página. Em caso de
**XSS** (Cross-Site Scripting) — por exemplo, uma dependência comprometida ou
conteúdo injetado sem sanitização — um script malicioso consegue ler o token e
exfiltrá-lo, assumindo a sessão do usuário. Tokens em `localStorage` também não
têm proteção de escopo/flags que um cookie oferece.

### Recomendação (evolução futura, fora do escopo desta tarefa)
- Migrar o `accessToken` para um **cookie `HttpOnly`** (inacessível via JS),
  idealmente com `Secure` e `SameSite` apropriados. O refresh token já usa
  `withCredentials: true` (ver `/auth/refresh`), o que indica caminho viável
  via cookies gerenciados pelo backend.
- Enquanto a migração não ocorre, reduzir superfície de XSS: manter dependências
  atualizadas, evitar `v-html` com dados não confiáveis e aplicar CSP.

> Esta migração NÃO foi feita agora para não alterar o fluxo de login/refresh em
> produção sem validação dedicada. Fica registrada como melhoria recomendada.

## 2. Autorização real está no backend

O redirecionamento por `meta.role` no guard `router.beforeEach`
(`src/router/index.ts`) é **apenas UX**: evita que o usuário veja telas que não
são da sua role e o encaminha para a home correta. Ele **não** é um controle de
segurança — roda no cliente e pode ser contornado.

A autorização efetiva é responsabilidade do **backend (NestJS)**, por meio dos
guards JWT (`@UseGuards(JwtAuthGuard)`) adicionados/garantidos em FEAT-001. Toda
rota sensível exige token válido e valida a identidade/perfil no servidor antes
de responder. O frontend assume que qualquer dado protegido só é liberado após
essa verificação no backend.

## 3. Cobertura de teste do guard de UX

O comportamento de redirecionamento por role está coberto por
`src/router/__tests__/roleGuard.spec.ts`, que verifica que um usuário `USER`
tentando acessar rotas `ADMIN`/`MANAGER` é levado para `/user` sem ser deslogado.
