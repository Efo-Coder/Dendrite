export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    iconPrimary: string;
    iconSecondary: string;
    bgPrimary: string;
    bgPrimaryVariant: string;
    bgPrimarySurface: string;
    bgSecondary: string;
    bgHeader: string;
    bgInput: string;
    bgElevated: string;
    borderDefault: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    textHyperlink: string;
    brandPrimary: string;
    brand500: string;
    brand600: string;
    brand700: string;
    brand800: string;
  };
}

function mixHex(c1: string, c2: string, w: number): string {
  const parse = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 * w + r2 * (1 - w));
  const g = Math.round(g1 * w + g2 * (1 - w));
  const b = Math.round(b1 * w + b2 * (1 - w));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function brandScale(brand: string, text: string) {
  return {
    brand500: mixHex(brand, '#ffffff', 0.6),
    brand600: mixHex(brand, '#ffffff', 0.88),
    brand700: mixHex(brand, text, 0.72),
    brand800: mixHex(text, brand, 0.85),
  };
}

// Light Mode Base
const lightModeBase = {
  bgPrimary: '#fcfcfc',
  bgPrimaryVariant: '#ffffff',
  bgPrimarySurface: '#ffffff',
  bgSecondary: '#fcfcfc',
  bgHeader: '#f7f7f7',
  bgInput: '#ffffff',
  bgElevated: '#f5f5f5',
  borderDefault: 'rgba(18, 18, 18, 0.15)',
  textPrimary: '#363535',
  textSecondary: '#767676',
  textMuted: '#767676',
  textAccent: '#ffffff',
};

// Dark Mode Base
const darkModeBase = {
  bgPrimary: '#000000',
  bgPrimaryVariant: '#131313',
  bgPrimarySurface: '#000000',
  bgSecondary: '#171717',
  bgHeader: '#1212126f',
  bgInput: '#1a1a1a',
  bgElevated: '#1b1b1b8b',
  borderDefault: '#3b3b3b',
  textPrimary: '#E7ECE7',
  textSecondary: '#A8B3A7',
  textMuted: '#858585',
  textAccent: '#ffffff',
};

export const themes: Record<string, Theme> = {
  // Sprout Green - Light & Dark
  sproutGreen: {
    id: 'sproutGreen',
    name: 'Sprout Green',
    description: 'Sanftes Pastell-Grün',
    colors: {
      ...lightModeBase,
      iconPrimary: '#4ade80',
      iconSecondary: '#4ade80',
      textHyperlink: '#93c5fd',
      brandPrimary: '#5D8A5B',
      ...brandScale('#5D8A5B', '#0e0000'),
    },
  },
  sproutGreenDark: {
    id: 'sproutGreenDark',
    name: 'Sprout Green Dark',
    description: 'Waldgrün — Fokus & Ruhe',
    colors: {
      ...darkModeBase,
      iconPrimary: '#4ade80',
      iconSecondary: '#4ade80',
      textHyperlink: '#93c5fd',
      brandPrimary: '#5D8A5B',
      ...brandScale('#5D8A5B', '#E7ECE7'),
    },
  },
  // Blossom Pink - Light & Dark
  blossomPink: {
    id: 'blossomPink',
    name: 'Blossom Rose',
    description: 'Zartes Rosa-Design',
    colors: {
      ...lightModeBase,
      iconPrimary: '#f472b6',
      iconSecondary: '#f472b6',
      textHyperlink: '#93c5fd',
      brandPrimary: '#c983a7',
      ...brandScale('#c983a7', '#831843'),
    },
  },
  blossomPinkDark: {
    id: 'blossomPinkDark',
    name: 'Blossom Rose Dark',
    description: 'Dunkles Design mit Rosa',
    colors: {
      ...darkModeBase,
      iconPrimary: '#ee36aa',
      iconSecondary: '#f472b6',
      textHyperlink: '#93c5fd',
      brandPrimary: '#c983a7',
      ...brandScale('#c983a7', '#E7ECE7'),
    },
  },
  // Neural Blue - Light & Dark
  neuralBlue: {
    id: 'neuralBlue',
    name: 'Neural Blue',
    description: 'Beruhigendes Blau',
    colors: {
      ...lightModeBase,
      iconPrimary: '#93c5fd',
      iconSecondary: '#1d4ed8',
      textHyperlink: '#93c5fd',
      brandPrimary: '#93c5fd',
      ...brandScale('#93c5fd', '#1e3a8a'),
    },
  },
  neuralBlueDark: {
    id: 'neuralBlueDark',
    name: 'Neural Blue Dark',
    description: 'Dunkles Design mit Blau',
    colors: {
      ...darkModeBase,
      iconPrimary: '#93c5fd',
      iconSecondary: '#1d4ed8',
      textHyperlink: '#93c5fd',
      brandPrimary: '#93c5fd',
      ...brandScale('#93c5fd', '#E7ECE7'),
    },
  },
  // Synapse Cream - Light & Dark
  synapseCream: {
    id: 'synapseCream',
    name: 'Synapse Cream',
    description: 'Warmes Creme-Design',
    colors: {
      ...lightModeBase,
      iconPrimary: '#eab308',
      iconSecondary: '#a16207',
      textHyperlink: '#93c5fd',
      brandPrimary: '#eab308',
      ...brandScale('#eab308', '#713f12'),
    },
  },
  synapseCreamDark: {
    id: 'synapseCreamDark',
    name: 'Synapse Cream Dark',
    description: 'Dunkles Design mit Gelb',
    colors: {
      ...darkModeBase,
      iconPrimary: '#eab308',
      iconSecondary: '#a16207',
      textHyperlink: '#93c5fd',
      brandPrimary: '#eab308',
      ...brandScale('#eab308', '#E7ECE7'),
    },
  },
  // Pulse Orange - Light & Dark
  pulseOrange: {
    id: 'pulseOrange',
    name: 'Pulse Orange',
    description: 'Energetisches Orange',
    colors: {
      ...lightModeBase,
      iconPrimary: '#fb923c',
      iconSecondary: '#c2410c',
      textHyperlink: '#93c5fd',
      brandPrimary: '#fb923c',
      ...brandScale('#fb923c', '#7c2d12'),
    },
  },
  pulseOrangeDark: {
    id: 'pulseOrangeDark',
    name: 'Pulse Orange Dark',
    description: 'Dunkles Design mit Orange',
    colors: {
      ...darkModeBase,
      iconPrimary: '#fb923c',
      iconSecondary: '#c2410c',
      textHyperlink: '#93c5fd',
      brandPrimary: '#fb923c',
      ...brandScale('#fb923c', '#E7ECE7'),
    },
  },
  // Branch Brown - Light & Dark
  branchBrown: {
    id: 'branchBrown',
    name: 'Branch Brown',
    description: 'Erdiges Braun',
    colors: {
      ...lightModeBase,
      iconPrimary: '#c8957f',
      iconSecondary: '#977669',
      textHyperlink: '#93c5fd',
      brandPrimary: '#5e3110',
      ...brandScale('#c8957f', '#43302b'),
    },
  },
  branchBrownDark: {
    id: 'branchBrownDark',
    name: 'Branch Brown Dark',
    description: 'Dunkles Design mit Braun',
    colors: {
      ...darkModeBase,
      iconPrimary: '#c8957f',
      iconSecondary: '#977669',
      textHyperlink: '#93c5fd',
      brandPrimary: '#5e3110',
      ...brandScale('#c8957f', '#E7ECE7'),
    },
  },
  // Growth Beige - Light & Dark
  growthBeige: {
    id: 'growthBeige',
    name: 'Growth Beige',
    description: 'Neutrales Beige',
    colors: {
      ...lightModeBase,
      iconPrimary: '#4d3823',
      iconSecondary: '#5f5a50',
      textHyperlink: '#93c5fd',
      brandPrimary: '#a0866f',
      ...brandScale('#a0866f', '#3e3b35'),
    },
  },
  growthBeigeDark: {
    id: 'growthBeigeDark',
    name: 'Growth Beige Dark',
    description: 'Dunkles Design mit Beige',
    colors: {
      ...darkModeBase,
      iconPrimary: '#a89888',
      iconSecondary: '#a89888',
      textHyperlink: '#93c5fd',
      brandPrimary: '#a89888',
      ...brandScale('#a89888', '#E7ECE7'),
    },
  },
  // Cortex Gray - Light & Dark
  cortexGray: {
    id: 'cortexGray',
    name: 'Cortex Gray',
    description: 'Elegantes Grau',
    colors: {
      ...lightModeBase,
      iconPrimary: '#8892a2',
      iconSecondary: '#8892a2',
      textHyperlink: '#93c5fd',
      brandPrimary: '#8892a2',
      ...brandScale('#8892a2', '#111827'),
    },
  },
  cortexGrayDark: {
    id: 'cortexGrayDark',
    name: 'Cortex Gray Dark',
    description: 'Dunkles Design mit Grau',
    colors: {
      ...darkModeBase,
      iconPrimary: '#8892a2',
      iconSecondary: '#8892a2',
      textHyperlink: '#93c5fd',
      brandPrimary: '#8892a2',
      ...brandScale('#8892a2', '#E7ECE7'),
    },
  },
};

// Theme-Reihenfolge für die Auswahl (nur Light-Themes, Dark wird über Toggle aktiviert)
export const themeOrder = [
  'sproutGreen',
  'blossomPink',
  'neuralBlue',
  'synapseCream',
  'pulseOrange',
  'branchBrown',
  'growthBeige',
  'cortexGray',
];
