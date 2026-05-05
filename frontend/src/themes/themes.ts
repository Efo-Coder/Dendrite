export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    iconColor: string;
    accentBg: string;
    accentSurface: string;
    accentElevated: string;
    accentBorder: string;
    accentMuted: string;
    accentBrand: string;
    accentBrandDim: string;
    accentSubtle: string;
    accentSecondary: string;
    accentFg: string;
  };
}

// Dark Mode Basis-Farben (verwendet für alle Dark Themes)
const darkModeBase = {
  iconColor: '#a3a3a3',       // Icon-Füllung (textSecondary)
  accentBg: '#0f0f0f',        // bg
  accentSurface: '#1a1a1a',   // surface
  accentElevated: '#242424',  // elevated
  accentBorder: '#2a2a2a',    // border
  accentMuted: '#737373',     // (muted als Platzhalter)
  accentBrand: '#a3a3a3',     // textSecondary als Hauptakzent
  accentBrandDim: '#a3a3a3',  // textSecondary
  accentSubtle: '#737373',    // textMuted
  accentSecondary: '#a3a3a3', // textSecondary
  accentFg: '#e5e5e5',        // textPrimary
};

export const themes: Record<string, Theme> = {
  // Sprout Green - Light & Dark
  sproutGreen: {
    id: 'sproutGreen',
    name: 'Sprout Green',
    description: 'Sanftes Pastell-Grün',
    colors: {
      iconColor: '#4ade80',
      accentBg: '#f0fdf4',
      accentSurface: '#dcfce7',
      accentElevated: '#bbf7d0',
      accentBorder: '#86efac',
      accentMuted: '#4ade80',
      accentBrand: '#4ade80',
      accentBrandDim: '#16a34a',
      accentSubtle: '#15803d',
      accentSecondary: '#166534',
      accentFg: '#14532d',
    },
  },
  sproutGreenDark: {
    id: 'sproutGreenDark',
    name: 'Sprout Green Dark',
    description: 'Dunkles Design mit Grün',
    colors: {
      ...darkModeBase,
      iconColor: '#10b981',
      accentBrand: '#10b981',
    },
  },
  // Blossom Pink - Light & Dark
  blossomPink: {
    id: 'blossomPink',
    name: 'Blossom Rose',
    description: 'Zartes Rosa-Design',
    colors: {
      iconColor: '#f472b6',
      accentBg: '#fdf2f8',
      accentSurface: '#fce7f3',
      accentElevated: '#fbcfe8',
      accentBorder: '#f9a8d4',
      accentMuted: '#f472b6',
      accentBrand: '#f472b6',
      accentBrandDim: '#db2777',
      accentSubtle: '#be185d',
      accentSecondary: '#9d174d',
      accentFg: '#831843',
    },
  },
  blossomPinkDark: {
    id: 'blossomPinkDark',
    name: 'Blossom Rose Dark',
    description: 'Dunkles Design mit Rosa',
    colors: {
      ...darkModeBase,
      iconColor: '#f472b6',
      accentBrand: '#f472b6',
    },
  },
  // Neural Blue - Light & Dark
  neuralBlue: {
    id: 'neuralBlue',
    name: 'Neural Blue',
    description: 'Beruhigendes Blau',
    colors: {
      iconColor: '#93c5fd',
      accentBg: '#eff6ff',
      accentSurface: '#dbeafe',
      accentElevated: '#bfdbfe',
      accentBorder: '#93c5fd',
      accentMuted: '#60a5fa',
      accentBrand: '#93c5fd',
      accentBrandDim: '#2563eb',
      accentSubtle: '#1d4ed8',
      accentSecondary: '#1e40af',
      accentFg: '#1e3a8a',
    },
  },
  neuralBlueDark: {
    id: 'neuralBlueDark',
    name: 'Neural Blue Dark',
    description: 'Dunkles Design mit Blau',
    colors: {
      ...darkModeBase,
      iconColor: '#93c5fd',
      accentBrand: '#93c5fd',
    },
  },
  // Synapse Cream - Light & Dark
  synapseCream: {
    id: 'synapseCream',
    name: 'Synapse Cream',
    description: 'Warmes Creme-Design',
    colors: {
      iconColor: '#eab308',
      accentBg: '#fefce8',
      accentSurface: '#fef9c3',
      accentElevated: '#fef08a',
      accentBorder: '#fde047',
      accentMuted: '#facc15',
      accentBrand: '#eab308',
      accentBrandDim: '#ca8a04',
      accentSubtle: '#a16207',
      accentSecondary: '#854d0e',
      accentFg: '#713f12',
    },
  },
  synapseCreamDark: {
    id: 'synapseCreamDark',
    name: 'Synapse Cream Dark',
    description: 'Dunkles Design mit Gelb',
    colors: {
      ...darkModeBase,
      iconColor: '#eab308',
      accentBrand: '#eab308',
    },
  },
  // Pulse Orange - Light & Dark
  pulseOrange: {
    id: 'pulseOrange',
    name: 'Pulse Orange',
    description: 'Energetisches Orange',
    colors: {
      iconColor: '#fb923c',
      accentBg: '#fff7ed',
      accentSurface: '#ffedd5',
      accentElevated: '#fed7aa',
      accentBorder: '#fdba74',
      accentMuted: '#fb923c',
      accentBrand: '#fb923c',
      accentBrandDim: '#ea580c',
      accentSubtle: '#c2410c',
      accentSecondary: '#9a3412',
      accentFg: '#7c2d12',
    },
  },
  pulseOrangeDark: {
    id: 'pulseOrangeDark',
    name: 'Pulse Orange Dark',
    description: 'Dunkles Design mit Orange',
    colors: {
      ...darkModeBase,
      iconColor: '#fb923c',
      accentBrand: '#fb923c',
    },
  },
  // Branch Brown - Light & Dark
  branchBrown: {
    id: 'branchBrown',
    name: 'Branch Brown',
    description: 'Erdiges Braun',
    colors: {
      iconColor: '#c8957f',
      accentBg: '#fdf8f6',
      accentSurface: '#f2e8e5',
      accentElevated: '#ddc8bc',
      accentBorder: '#d4b8ac',
      accentMuted: '#d2bab0',
      accentBrand: '#c8957f',
      accentBrandDim: '#d4a892',
      accentSubtle: '#977669',
      accentSecondary: '#846358',
      accentFg: '#43302b',
    },
  },
  branchBrownDark: {
    id: 'branchBrownDark',
    name: 'Branch Brown Dark',
    description: 'Dunkles Design mit Braun',
    colors: {
      ...darkModeBase,
      iconColor: '#c8957f',
      accentBrand: '#c8957f',
    },
  },
  // Growth Beige - Light & Dark
  growthBeige: {
    id: 'growthBeige',
    name: 'Growth Beige',
    description: 'Neutrales Beige',
    colors: {
      iconColor: '#a89888',
      accentBg: '#faf9f7',
      accentSurface: '#e7e5df',
      accentElevated: '#ccc4b5',
      accentBorder: '#bab4a6',
      accentMuted: '#a39e93',
      accentBrand: '#a89888',
      accentBrandDim: '#b8a898',
      accentSubtle: '#5f5a50',
      accentSecondary: '#4e4a42',
      accentFg: '#3e3b35',
    },
  },
  growthBeigeDark: {
    id: 'growthBeigeDark',
    name: 'Growth Beige Dark',
    description: 'Dunkles Design mit Beige',
    colors: {
      ...darkModeBase,
      iconColor: '#a89888',
      accentBrand: '#a89888',
    },
  },
  // Cortex Gray - Light & Dark
  cortexGray: {
    id: 'cortexGray',
    name: 'Cortex Gray',
    description: 'Elegantes Grau',
    colors: {
      iconColor: '#8892a2',
      accentBg: '#f9fafb',
      accentSurface: '#f3f4f6',
      accentElevated: '#d0d6e2',
      accentBorder: '#bec5d1',
      accentMuted: '#9ca3af',
      accentBrand: '#8892a2',
      accentBrandDim: '#98a2b2',
      accentSubtle: '#374151',
      accentSecondary: '#1f2937',
      accentFg: '#111827',
    },
  },
  cortexGrayDark: {
    id: 'cortexGrayDark',
    name: 'Cortex Gray Dark',
    description: 'Dunkles Design mit Grau',
    colors: {
      ...darkModeBase,
      iconColor: '#8892a2',
      accentBrand: '#8892a2',
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
