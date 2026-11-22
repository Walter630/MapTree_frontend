import type { LandingDocument } from '../../src/types/landing'

const image = (staticPath: string, alt = '') => ({ staticPath, assetId: null, alt })

export const landingDocumentFixture: LandingDocument = {
  schemaVersion: 1,
  order: ['prevention', 'productDemo', 'workflow', 'features', 'audience', 'about', 'analytics', 'faq', 'finalCta'],
  visibility: {
    prevention: true,
    productDemo: true,
    workflow: true,
    features: true,
    audience: true,
    about: true,
    analytics: true,
    faq: true,
    finalCta: true,
    footer: true,
  },
  fields: {
    header: {
      logo: image('/landing/maptree-logo.png', 'MapTree'),
      navigation: [
        { label: 'Como funciona', href: '#como-funciona' },
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Sobre', href: '#sobre' },
      ],
      loginLabel: 'Entrar',
      accessLabel: 'Solicitar acesso',
    },
    hero: {
      desktopImage: image('/landing/maptree-hero-desktop.webp'),
      mobileImage: image('/landing/maptree-hero-mobile.webp'),
      title: 'Gestão de árvores para planejar podas preventivas.',
      description: 'Cadastre, mapeie e acompanhe as árvores da sua região. O MapTree reúne localização, espécie e histórico de manutenção para apoiar decisões, organizar equipes e acompanhar o manejo da vegetação.',
      primaryActionLabel: 'Solicitar acesso',
      secondaryActionLabel: 'Conhecer funcionalidades',
      secondaryActionHref: '#funcionalidades',
      capabilities: ['Monitoramento', 'Mapas', 'Notificações'],
      previewImage: image('/dashboard-previews/dashboard-campo.svg', 'Prévia demonstrativa do mapa e do inventário do MapTree'),
      previewCaption: 'Prévia do MapTree · dados demonstrativos',
    },
    prevention: {
      title: 'A prevenção começa com informação organizada.',
      description: 'A vegetação próxima às redes elétrica e de telecomunicações, às vias públicas e às construções exige acompanhamento contínuo. Galhos e árvores sem monitoramento adequado podem contribuir para interrupções de serviços, danos à infraestrutura e riscos para trabalhadores e população. O MapTree organiza os dados da cobertura arbórea para apoiar a identificação de prioridades e o planejamento de podas preventivas, além de registrar o trabalho realizado pelas equipes.',
    },
    productDemo: {
      title: 'Da rota planejada ao atendimento concluído.',
      description: 'Acompanhe as paradas no mapa e avance pela demonstração. Os dados desta prévia são fictícios e ficam somente nesta página.',
      caption: 'Exemplo visual com dados fictícios para demonstração.',
    },
    workflow: {
      title: 'Como funciona',
      description: 'Da primeira informação sobre a árvore ao acompanhamento das atividades de campo.',
      steps: [
        { id: 'cadastre', number: '01', image: image('/dashboard-previews/dashboard-campo.svg', 'Prévia do mapa de árvores usado pela equipe de campo'), title: 'Cadastre', description: 'Registre as árvores com localização, espécie e informações de manutenção.' },
        { id: 'acompanhe', number: '02', image: image('/dashboard-previews/dashboard-campo.svg', 'Prévia do inventário de árvores no mapa da região atendida'), title: 'Acompanhe', description: 'Consulte o inventário e visualize os registros no mapa da região atendida.' },
        { id: 'planeje', number: '03', image: image('/dashboard-previews/dashboard-operacional.svg', 'Prévia do planejamento operacional de rotas'), title: 'Planeje', description: 'Organize prioridades e rotas para as atividades de campo.' },
        { id: 'registre', number: '04', image: image('/dashboard-previews/dashboard-analitico.svg', 'Prévia do acompanhamento e histórico de atendimentos'), title: 'Registre', description: 'Acompanhe podas e mantenha o histórico das ações realizadas.' },
      ],
    },
    features: {
      title: 'Funcionalidades para organizar a operação.',
      description: 'Recursos disponíveis no MapTree para acompanhar inventário, equipes e atividades.',
      items: [
        { id: 'inventory', title: 'Inventário de árvores', description: 'Centralize os registros e consulte as informações de cada árvore.', icon: '⌖' },
        { id: 'mapping', title: 'Mapeamento por região', description: 'Visualize os dados da área atendida pela empresa em um mapa interativo.', icon: '⌘' },
        { id: 'history', title: 'Histórico de manutenção', description: 'Acompanhe as atividades, seus responsáveis e as pendências de atendimento.', icon: '↻' },
        { id: 'teams', title: 'Gestão de equipes', description: 'Organize o acesso de gestores e funcionários e acompanhe as atividades.', icon: '♧' },
        { id: 'routes', title: 'Planejamento de rotas', description: 'Reúna árvores que precisam de atendimento e organize a sequência das paradas.', icon: '⇢' },
        { id: 'indicators', title: 'Indicadores', description: 'Consulte informações do inventário e das atividades para acompanhar a operação.', icon: '▤' },
      ],
    },
    audience: {
      title: 'Informações organizadas para quem atua no manejo da vegetação.',
      description: 'Para concessionárias, prefeituras, órgãos ambientais e equipes que atuam no manejo da vegetação.',
      cards: [
        { id: 'field', title: 'Equipes de campo', description: 'Localize árvores, confira as próximas paradas e registre os atendimentos realizados.', icon: '⌖' },
        { id: 'managers', title: 'Gestores de arborização', description: 'Acompanhe o inventário, as pendências e o histórico de trabalho das equipes.', icon: '▤' },
      ],
    },
    about: {
      mainImage: image('/landing/maptree-urban-canopy.webp', 'Árvore urbana madura próxima a uma rede aérea de distribuição, em rua residencial brasileira'),
      insetImage: image('/landing/maptree-field-team.webp', 'Dois profissionais de arborização consultam um tablet durante uma vistoria sob as árvores'),
      mainCaption: 'Do mapa à vistoria',
      insetCaption: 'Vistoria em campo',
      title: 'Uma visão compartilhada do trabalho em campo.',
      paragraphs: [
        'O MapTree reúne informações de árvores, equipes e atividades para apoiar o acompanhamento da vegetação nas cidades. Da consulta ao mapa ao histórico de manutenção, os registros ajudam a organizar o trabalho cotidiano.',
        'Os recursos de análise apoiam a priorização de vistorias. A avaliação e as decisões de campo continuam com profissionais.',
      ],
      actionLabel: 'Solicite acesso ao MapTree',
    },
    analytics: {
      badge: 'Em desenvolvimento',
      title: 'Inteligência para apoiar as próximas decisões.',
      paragraphs: [
        'A evolução do MapTree prevê o uso de histórico de manutenção, características das espécies, condições ambientais e dados geográficos para apoiar a identificação de áreas prioritárias e a recomendação do período de poda.',
        'Esses recursos serão desenvolvidos e avaliados com dados reais, considerando as particularidades de cada região.',
      ],
    },
    faq: {
      title: 'Perguntas frequentes.',
      items: [
        { id: 'tree-registration', question: 'Como cadastro uma árvore?', answer: 'No mapa, indique a localização e registre a espécie e as informações disponíveis para identificar a árvore no inventário.' },
        { id: 'daily-routes', question: 'Como funcionam as rotas por data?', answer: 'As equipes consultam as paradas organizadas para cada dia e acompanham a sequência de trabalho planejada.' },
        { id: 'pruning-history', question: 'Onde vejo o histórico de podas?', answer: 'Na área de podas, consulte os atendimentos registrados e o histórico relacionado às árvores do inventário.' },
      ],
    },
    finalCta: {
      title: 'Solicite acesso ao MapTree.',
      description: 'Preencha seu cadastro. Nossa equipe analisará a solicitação e definirá o vínculo com a empresa.',
      buttonLabel: 'Solicitar acesso',
    },
    footer: {
      tagline: 'Gestão de árvores urbanas, do mapa ao campo.',
      links: [
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Como funciona', href: '#como-funciona' },
        { label: 'Sobre', href: '#sobre' },
      ],
      loginLabel: 'Entrar',
      accessLabel: 'Solicitar acesso',
      pendingLinks: 'Links de suporte, termos e privacidade serão publicados em breve.',
      backToTopLabel: 'Voltar ao início ↑',
    },
  },
}
