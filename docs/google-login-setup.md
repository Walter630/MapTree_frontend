# Login Google — frontend Vue e backend NestJS

## Fluxo implementado

1. O frontend renderiza o botão oficial Google Identity Services.
2. O Google retorna um ID token ao callback; o frontend envia `{ credential }`
   para `POST /api/auth/google`.
3. O backend NestJS em `/home/josewalter/IdeaProjects/backend-maptree` verifica
   assinatura, audiência, emissor e expiração com `google-auth-library`.
4. Exige `sub`, e-mail verificado e uma identidade Gmail ou Workspace com `hd`.
   Contas de outros provedores precisam de confirmação adicional e são recusadas.
5. Busca uma única conta MapTree pelo e-mail sem diferenciar maiúsculas e minúsculas.
   Não cria contas automaticamente; contas ausentes, ambíguas ou inativas são recusadas.
6. Usa o perfil e a organização salvos no banco para emitir o JWT MapTree e o mesmo
   cookie HttpOnly de renovação usado pelo login por senha. A senha não é retornada.

A implementação Java de outro repositório não atende o frontend configurado na porta
4000. A rota foi implementada no backend NestJS que já atende essa porta.

## Configuração local

No frontend (`.env`):

```dotenv
VITE_API_BASE_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
```

No backend NestJS (`.env`):

```dotenv
GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
CORS_ORIGIN=http://localhost:3500,http://localhost:4000
```

Use o mesmo OAuth Web Client ID nos dois projetos. O Client ID é público e não é
um client secret. O valor válido já presente no frontend foi configurado também
no backend local em 06/11/2026. Credenciais de banco/JWT existentes foram preservadas.

No Google Cloud Console, autorize `http://localhost:3500` como JavaScript origin.
Abra o frontend com esse hostname; `127.0.0.1` é uma origem diferente.
Reinicie o frontend após alterar variáveis `VITE_*` e o backend após alterar seu `.env`.
O login requer uma conta MapTree ativa com o mesmo e-mail da conta Google.

## Verificação

```sh
curl -i -X POST http://localhost:4000/api/auth/google \
  -H 'Content-Type: application/json' --data '{}'
```

O corpo vazio deve retornar 400; uma credencial inválida deve retornar 401, nunca
`Cannot POST /api/auth/google`. O teste real depende do usuário concluir o popup
Google no navegador. Verifique também acesso às rotas protegidas, refresh e logout.

Em 06/11/2026 foram confirmados na API local: corpo vazio → 400, token inválido →
401 e preflight da origem `http://localhost:3500` → 204 com credenciais permitidas.
Os testes automatizados cobrem validação de identidade, audiência passada à biblioteca,
conta inexistente/ambígua/inativa, DTO inválido e sessão com refresh. A verificação
Google é simulada nos testes; o JWT e o cookie da aplicação são exercitados pelo HTTP.

## Produção

O `vercel.json` encaminha `/api/*` para `https://api.maptree.com.br/api/*`. Deixe
`VITE_API_BASE_URL` vazio no Vercel para usar `/api` no mesmo domínio do frontend.
O primeiro vínculo pede a senha MapTree. Depois disso, o identificador Google
vinculado identifica a conta nos próximos logins.

Configure `GOOGLE_CLIENT_ID` no ambiente do processo da API e o mesmo
`VITE_GOOGLE_CLIENT_ID` no build do frontend. Inclua os domínios reais
(`https://www.maptree.com.br` e, se usado, `https://maptree.com.br`) no `CORS_ORIGIN`
e nas origens JavaScript autorizadas do Google. Aplique o schema Prisma antes
de iniciar o backend atualizado para criar o índice único dos vínculos.

Publique também as alterações do frontend para aplicar o cabeçalho COOP do Vercel.
`same-origin-allow-popups` foi configurado no Vercel, no Vite e no preview; ele não
substitui a implementação da rota. Nenhuma publicação em produção foi realizada.

## Referências oficiais

- [Verificar ID tokens no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Configurar Client ID e política COOP](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Renderizar o botão oficial](https://developers.google.com/identity/gsi/web/guides/display-button)
