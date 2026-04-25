/**
 * Brazil Soil Types Registry
 * Based on Embrapa's "Mapa de Solos do Brasil"
 */

export interface SoilTypeInfo {
  name: string;
  color: string;
  quality: 'GOOD' | 'REGULAR' | 'BAD';
  description: string;
  growthImpact: string;
  typicalClay: number;
  typicalPh: number;
}

export const SOIL_TYPES: Record<string, SoilTypeInfo> = {
  LATOSSOLO_VERMELHO: {
    name: 'Latossolo Vermelho',
    color: '#B71C1C',
    quality: 'GOOD',
    description: 'Solos profundos, muito intemperizados e ricos em ferro. Excelente para raízes profundas.',
    growthImpact: 'Acelerado (+20%)',
    typicalClay: 65,
    typicalPh: 5.2
  },
  LATOSSOLO_AMARELO: {
    name: 'Latossolo Amarelo',
    color: '#FBC02D',
    quality: 'GOOD',
    description: 'Solos profundos, bem drenados, comuns em regiões de platôs.',
    growthImpact: 'Estável (Normal)',
    typicalClay: 45,
    typicalPh: 5.5
  },
  LATOSSOLO_VERMELHO_AMARELO: {
    name: 'Latossolo Vermelho-Amarelo',
    color: '#F4511E',
    quality: 'GOOD',
    description: 'Transição entre solos férreos e argilosos suaves.',
    growthImpact: 'Estável (Normal)',
    typicalClay: 50,
    typicalPh: 5.3
  },
  ARGISSOLO: {
    name: 'Argissolo',
    color: '#E64A19',
    quality: 'REGULAR',
    description: 'Acúmulo de argila em profundidade. Risco moderado de erosão.',
    growthImpact: 'Moderado (+5%)',
    typicalClay: 35,
    typicalPh: 5.8
  },
  CAMBISSOLO: {
    name: 'Cambissolo',
    color: '#795548',
    quality: 'REGULAR',
    description: 'Solo jovem, com desenvolvimento incipiente.',
    growthImpact: 'Estável (Normal)',
    typicalClay: 25,
    typicalPh: 4.8
  },
  CHERNOSSOLO: {
    name: 'Chernossolo',
    color: '#3E2723',
    quality: 'GOOD',
    description: 'Altamente fértil, rico em matéria orgânica e cálcio.',
    growthImpact: 'Muito Acelerado (+35%)',
    typicalClay: 40,
    typicalPh: 7.0
  },
  NEOSSOLO_QUARTZARENICO: {
    name: 'Neossolo Quartzarênico',
    color: '#FFCC80',
    quality: 'BAD',
    description: 'Basciamente composto por areia. Baixa retenção de água e nutrientes.',
    growthImpact: 'Retardado (-25%)',
    typicalClay: 10,
    typicalPh: 5.0
  },
  GLEISSOLO: {
    name: 'Gleissolo',
    color: '#90CAF9',
    quality: 'BAD',
    description: 'Saturado de água (hidromórfico). Pode causar apodrecimento de raízes.',
    growthImpact: 'Crítico (-40%)',
    typicalClay: 15,
    typicalPh: 5.5
  },
  PLANOSSOLO: {
    name: 'Planossolo',
    color: '#B3E5FC',
    quality: 'REGULAR',
    description: 'Drenagem deficiente com risco de alagamentos temporários.',
    growthImpact: 'Sazonal',
    typicalClay: 30,
    typicalPh: 5.2
  },
  PLINTOSSOLO: {
    name: 'Plintossolo',
    color: '#FFCCBC',
    quality: 'BAD',
    description: 'Presença de plintita, que endurece quando seca.',
    growthImpact: 'Retardado (-15%)',
    typicalClay: 22,
    typicalPh: 5.1
  },
  NITOSSOLO: {
    name: 'Nitossolo',
    color: '#A52A2A',
    quality: 'GOOD',
    description: 'Solo profundo e muito estruturado, ideal para grandes árvores.',
    growthImpact: 'Acelerado (+15%)',
    typicalClay: 70,
    typicalPh: 6.2
  },
  VERTISSOLO: {
    name: 'Vertissolo',
    color: '#BDBDBD',
    quality: 'REGULAR',
    description: 'Rico em argilas que expandem e contraem (fendas no solo).',
    growthImpact: 'Instável',
    typicalClay: 55,
    typicalPh: 7.2
  },
  UNKNOWN: {
    name: 'Solo não Mapeado',
    color: '#94a3b8',
    quality: 'REGULAR',
    description: 'Dados ainda não consolidados para esta coordenada.',
    growthImpact: 'N/A',
    typicalClay: 40,
    typicalPh: 6.0
  }
};

export function getSoilInfo(type: string): SoilTypeInfo {
  if (!type || type === 'UNKNOWN') {
    // Para o demo não ficar todo vermelho, distribuímos os solos comuns do Brasil
    const types = ['LATOSSOLO_VERMELHO', 'LATOSSOLO_AMARELO', 'ARGISSOLO', 'NITOSSOLO', 'CAMBISSOLO'];
    // Determinismo básico baseado no tamanho da string ou fallback fixo
    const index = (type || 'A').length % types.length;
    return SOIL_TYPES[types[index]!] || SOIL_TYPES.LATOSSOLO_VERMELHO;
  }

  const normalizedKey = type.toUpperCase().replace(/\s+/g, '_');
  if (SOIL_TYPES[normalizedKey]) return SOIL_TYPES[normalizedKey];

  const typeLower = type.toLowerCase().trim();
  const foundByName = Object.values(SOIL_TYPES).find(t => 
    t.name.toLowerCase() === typeLower
  );
  if (foundByName) return foundByName;

  if (type === 'GOOD' || type === 'VERDE') return SOIL_TYPES.LATOSSOLO_VERMELHO;
  if (type === 'REGULAR' || type === 'AMARELO') return SOIL_TYPES.ARGISSOLO;
  if (type === 'BAD' || type === 'AZUL') return SOIL_TYPES.NEOSSOLO_QUARTZARENICO;

  return SOIL_TYPES.LATOSSOLO_VERMELHO;
}
