# Login Google — implementação e configuração

## Como o fluxo funciona

1. A tela de login renderiza o botão oficial do Google Identity Services (GIS). O site não simula esse botão com um botão próprio, conforme as regras de integração do Google.
2. Depois do consentimento, o navegador recebe um ID token assinado (JWT).
3. O frontend envia o token para `POST /auth/google`.
4. O backend valida assinatura, expiração, emissor e audiência com `GoogleIdTokenVerifier`, exige e-mail verificado e encontra uma conta MapTree existente por e-mail sem diferenciar maiúsculas/minúsculas.
5. O backend emite o mesmo JWT/sessão MapTree usado pelo login normal.

O endpoint **não cria usuários automaticamente** nem escolhe perfil/role a partir do Google. O usuário precisa ter uma conta MapTree com o e-mail Google verificado. Para proteger contas ligadas a domínios externos, a implementação aceita endereço `@gmail.com` ou conta Google Workspace com claim de domínio `hd`.

## Configuração ainda necessária

O Client ID não está configurado no `.env` local neste momento. Sem isso, a tela mostra “Login com Google indisponível” e não renderiza o botão.

1. No Google Cloud Console, configure a tela de consentimento OAuth e crie um OAuth Client ID do tipo **Web application**.
2. Cadastre os JavaScript origins usados pela aplicação, por exemplo `http://localhost:3500` e o domínio real de produção.
3. Configure o mesmo Web Client ID no frontend (`VITE_GOOGLE_CLIENT_ID`) e no backend (`GOOGLE_CLIENT_ID`). O client ID não é segredo; não coloque client secret no frontend.
4. Configure `CORS_ALLOWED_ORIGINS` no backend com as origens reais separadas por vírgula. Os padrões no código são apenas localhost/127.0.0.1 para desenvolvimento.
5. Inicie API e frontend e valide um login com uma conta previamente cadastrada. Também valide origem não permitida, token com audiência errada, e-mail sem verificação e conta MapTree inexistente.

## Arquivos envolvidos

- Frontend: `src/plugins/googleAuth.ts`, `src/components/MainView/LoginComponent.vue`, `src/plugins/apiConnect.ts`.
- Backend Java separado: `GoogleIdentityConfig`, `GoogleLoginRequest`, `UserAuthController`, `UserService`, `UserRepository` e `SecurityConfig`.
- Variáveis: `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `CORS_ALLOWED_ORIGINS`.

## Decisões e segurança

- Usar o SDK oficial GIS para renderizar o botão; One Tap/`prompt()` não é usado para fingir um clique em botão personalizado.
- Nunca confiar em nome/e-mail/role enviados como JSON pelo navegador; o backend deriva os dados do ID token verificado e do usuário persistido.
- O backend verifica o token com chave pública rotacionada pelo Google e audiência igual ao Client ID do aplicativo. O frontend não valida nem decodifica o token como autenticação.
- Não usar `tokeninfo` como verificação de produção; a documentação do Google o reserva para depuração.
- O logout/refresh continua usando o fluxo existente do MapTree.

## Referências oficiais

- [Integrar o Google Identity Services](https://developers.google.com/identity/gsi/web/guides/integrate)
- [Renderizar o botão oficial](https://developers.google.com/identity/gsi/web/guides/display-button)
- [Verificar ID tokens no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Criar/configurar Client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## Validação já executada

- Frontend: testes GIS verificam renderização do botão oficial, callback da credencial e falha sem Client ID.
- Backend: testes verificam token inválido, e-mail não verificado, usuário não cadastrado e login de usuário existente.
- Ainda falta o teste real com Client ID/origens do projeto Google e API/ambiente implantado, pois o Client ID local está vazio.
