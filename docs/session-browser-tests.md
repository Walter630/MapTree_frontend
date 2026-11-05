# Validação de sessão no navegador

Execute na pasta MapTree_frontend. A suíte usa a tela real de login e a API real. Cada teste abre um navegador isolado e não cadastra, altera ou exclui árvores, espécies ou usuários. Login e logout modificam a sessão da conta de teste.

## Cenários

- Página de login disponível.
- Login cria cookie HttpOnly e resiste ao recarregamento.
- Access token inválido provoca refresh com o cookie real e a chamada protegida volta a funcionar.
- Cookie ausente provoca 401 e retorno ao login.
- Logout limpa cookie e token e impede reabrir o painel sem entrar novamente.

A invalidação do access token é feita no armazenamento isolado do navegador. A expiração criptográfica já é coberta pelos testes HTTP do backend. Nenhuma resposta da API é simulada nesta suíte.

## Preparação

Use uma conta de teste existente com senha já armazenada em bcrypt. Contas legadas podem ter a senha migrada pelo backend ao efetuar login.

Configure o e-mail no terminal e leia a senha sem exibi-la nem salvá-la no histórico:

```sh
export E2E_EMAIL='conta-de-teste@exemplo.com'
read -rs 'E2E_PASSWORD?Senha da conta de teste: '
export E2E_PASSWORD
```

Se o Chromium do Playwright ainda não estiver instalado:

```sh
npx playwright install chromium
```

## Execução local

Mantenha o backend ligado. A configuração inicia ou reutiliza o frontend na porta 3500. Ele usa a API definida em VITE_API_BASE_URL.

```sh
npm run test:session
```

## Ambiente publicado

```sh
export E2E_BASE_URL='https://maptree.com.br'
# Opcional: limite a observação à origem da API de destino.
export E2E_API_URL='https://endereco-real-da-api/api'
npm run test:session
```

Substitua o endereço da API pelo endereço real. E2E_API_URL não troca a API usada pelo site publicado, que é definida no build do frontend.

A suíte usa os domínios originais e a política real de cookies, sem ignorar certificados nem alterar CORS. Falhas no cookie precisam ser investigadas considerando HTTPS, SameSite, origem do frontend e origem da API. Traces e vídeos ficam desligados para evitar gravar credenciais ou tokens.

Sem E2E_EMAIL e E2E_PASSWORD, os testes autenticados falham com instrução de configuração. A execução de `--list` apenas lista os testes, sem validar as sessões.

Para testar somente a disponibilidade da página, sem credenciais:

```sh
npm run test:session -- --grep 'página de login'
```

A visualização compartilhada das árvores não é tratada como falha de isolamento nesta suíte. Permissões para cadastrar ou alterar registros exigem uma regra própria.

## Validação local em 05/11/2026

A primeira execução encontrou duas falhas: o navegador não armazenava o cookie de renovação e não o enviava ao refresh. O frontend usava http://localhost:3500 e VITE_API_BASE_URL apontava para http://127.0.0.1:4000/api. A configuração local foi ajustada para http://localhost:4000/api, mantendo o mesmo hostname nos dois serviços e preservando a política do cookie.

Após o ajuste, os cinco testes passaram no Chromium local, com a conta de teste fornecida. A renovação foi confirmada por chamada real ao backend, seguida de nova consulta autenticada após recarregar. O teste de logout confirmou a remoção do cookie e do access token. Nenhuma árvore ou espécie foi alterada pela suíte.

A alteração de VITE_API_BASE_URL foi feita no arquivo .env local, ignorado pelo Git. O domínio maptree.com.br ainda precisa de uma execução própria, pois possui configuração de origem e HTTPS distinta. Nenhuma credencial foi adicionada aos arquivos de teste ou a este documento.
