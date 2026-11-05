# Inventário por espécie e consulta de concentração

No painel, cada espécie deve mostrar sua quantidade cadastrada conforme a contagem de árvores retornada por /species. Zero é um valor válido. Uma resposta sem contagem deve indicar indisponibilidade.

No mapa, o inventário deve estar na primeira aba. Cada linha representa os pontos reais carregados da espécie e permite filtrar a camada de calor. Os símbolos da Oiticica e do Ipê-Amarelo do seed de exemplo devem coincidir no painel e nos mapas. A cor do marcador continua indicando a situação da árvore.

No cadastro, um atalho abre o mapa de calor em outra aba para preservar o formulário em andamento. O destino depende do perfil e deve abrir a camada já ligada. Os dados de exemplo servem de referência para os testes.

## Seleção de espécie no cadastro de árvore

A seção Identificação carrega todas as páginas de /species e oferece busca por nome popular e científico. O diálogo de cadastro usa POST /species, exige os três campos previstos no backend e seleciona a resposta ao salvar. Erros preservam os campos e o cadastro da árvore. Registros duplicados no catálogo são indicados antes do envio. A base atual não associa espécies a regiões, portanto o seletor identifica os dados como catálogo disponível.

A seleção fica em um card. Ao abrir as opções, a lista oferece cadastro de nova espécie, busca por nome e rolagem com altura limitada a 360 px. O diálogo fecha a lista antes de abrir para evitar sobreposição de menus.

## Catálogo no dashboard

O catálogo volta ao painel inferior, em lista compacta com cinco linhas por página, contagem, nome e nome científico. A busca fica sempre disponível e filtra todo o catálogo carregado. Links levam ao mapa de calor da espécie. A paginação mantém a quantidade de elementos renderizados limitada mesmo com mil espécies. O painel se adapta à largura disponível e empilha no celular.

## Mapa operacional no dashboard

O mapa recebe o mesmo inventário e os mesmos IDs prioritários da lista ao lado. Não consulta a API novamente. O modo Prioridades mostra a quantidade georreferenciada e setores de referência de 250 m. A concentração considera todas as árvores com coordenadas válidas. Clicar em um marcador ou agrupamento filtra as prioridades da lista, com ação de limpar. O zoom se ajusta aos dados e ResizeObserver corrige o tamanho quando o layout muda. A legenda corresponde aos estados exibidos. Rede elétrica simulada deixa de ser usada para classificar risco no dashboard. Superfícies em verde/cinza se limitam aos dashboards.
