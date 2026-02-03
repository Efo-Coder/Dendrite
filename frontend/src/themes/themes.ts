export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    iconColor: string;
    accent50: string;
    accent100: string;
    accent200: string;
    accent300: string;
    accent400: string;
    accent500: string;
    accent600: string;
    accent700: string;
    accent800: string;
    accent900: string;
  };
}

// Dark Mode Basis-Farben (verwendet für alle Dark Themes)
const darkModeBase = {
  iconColor: '#a3a3a3',     // Icon-Füllung (textSecondary)
  accent50: '#0f0f0f',      // bg
  accent100: '#1a1a1a',     // surface
  accent200: '#242424',     // elevated
  accent300: '#2a2a2a',     // border
  accent400: '#737373',     // (muted als Platzhalter)
  accent500: '#a3a3a3',     // textSecondary als Hauptakzent
  accent600: '#a3a3a3',     // textSecondary
  accent700: '#737373',     // textMuted
  accent800: '#a3a3a3',     // textSecondary
  accent900: '#e5e5e5',     // textPrimary
};

export const themes: Record<string, Theme> = {
  // Sprout Green - Light & Dark
  sproutGreen: {
    id: 'sproutGreen',
    name: 'Sprout Green',
    description: 'Sanftes Pastell-Grün',
    colors: {
      iconColor: '#4ade80',
      accent50: '#f0fdf4',
      accent100: '#dcfce7',
      accent200: '#bbf7d0',
      accent300: '#86efac',
      accent400: '#4ade80',
      accent500: '#4ade80',
      accent600: '#16a34a',
      accent700: '#15803d',
      accent800: '#166534',
      accent900: '#14532d',
    },
  },
  sproutGreenDark: {
    id: 'sproutGreenDark',
    name: 'Sprout Green Dark',
    description: 'Dunkles Design mit Grün',
    colors: {
      ...darkModeBase,
      iconColor: '#10b981',
      accent500: '#10b981',
    },
  },
  // Blossom Pink - Light & Dark
  blossomPink: {
    id: 'blossomPink',
    name: 'Blossom Rose',
    description: 'Zartes Rosa-Design',
    colors: {
      iconColor: '#f472b6',
      accent50: '#fdf2f8',
      accent100: '#fce7f3',
      accent200: '#fbcfe8',
      accent300: '#f9a8d4',
      accent400: '#f472b6',
      accent500: '#f472b6',
      accent600: '#db2777',
      accent700: '#be185d',
      accent800: '#9d174d',
      accent900: '#831843',
    },
  },
  blossomPinkDark: {
    id: 'blossomPinkDark',
    name: 'Blossom Rose Dark',
    description: 'Dunkles Design mit Rosa',
    colors: {
      ...darkModeBase,
      iconColor: '#f472b6',
      accent500: '#f472b6',
    },
  },
  // Neural Blue - Light & Dark
  neuralBlue: {
    id: 'neuralBlue',
    name: 'Neural Blue',
    description: 'Beruhigendes Blau',
    colors: {
      iconColor: '#93c5fd',
      accent50: '#eff6ff',
      accent100: '#dbeafe',
      accent200: '#bfdbfe',
      accent300: '#93c5fd',
      accent400: '#60a5fa',
      accent500: '#93c5fd',
      accent600: '#2563eb',
      accent700: '#1d4ed8',
      accent800: '#1e40af',
      accent900: '#1e3a8a',
    },
  },
  neuralBlueDark: {
    id: 'neuralBlueDark',
    name: 'Neural Blue Dark',
    description: 'Dunkles Design mit Blau',
    colors: {
      ...darkModeBase,
      iconColor: '#93c5fd',
      accent500: '#93c5fd',
    },
  },
  // Synapse Cream - Light & Dark
  synapseCream: {
    id: 'synapseCream',
    name: 'Synapse Cream',
    description: 'Warmes Creme-Design',
    colors: {
      iconColor: '#eab308',
      accent50: '#fefce8',
      accent100: '#fef9c3',
      accent200: '#fef08a',
      accent300: '#fde047',
      accent400: '#facc15',
      accent500: '#eab308',
      accent600: '#ca8a04',
      accent700: '#a16207',
      accent800: '#854d0e',
      accent900: '#713f12',
    },
  },
  synapseCreamDark: {
    id: 'synapseCreamDark',
    name: 'Synapse Cream Dark',
    description: 'Dunkles Design mit Gelb',
    colors: {
      ...darkModeBase,
      iconColor: '#eab308',
      accent500: '#eab308',
    },
  },
  // Pulse Orange - Light & Dark
  pulseOrange: {
    id: 'pulseOrange',
    name: 'Pulse Orange',
    description: 'Energetisches Orange',
    colors: {
      iconColor: '#fb923c',
      accent50: '#fff7ed',
      accent100: '#ffedd5',
      accent200: '#fed7aa',
      accent300: '#fdba74',
      accent400: '#fb923c',
      accent500: '#fb923c',
      accent600: '#ea580c',
      accent700: '#c2410c',
      accent800: '#9a3412',
      accent900: '#7c2d12',
    },
  },
  pulseOrangeDark: {
    id: 'pulseOrangeDark',
    name: 'Pulse Orange Dark',
    description: 'Dunkles Design mit Orange',
    colors: {
      ...darkModeBase,
      iconColor: '#fb923c',
      accent500: '#fb923c',
    },
  },
  // Branch Brown - Light & Dark
  branchBrown: {
    id: 'branchBrown',
    name: 'Branch Brown',
    description: 'Erdiges Braun',
    colors: {
      iconColor: '#846358',
      accent50: '#fdf8f6',
      accent100: '#f2e8e5',
      accent200: '#eaddd7',
      accent300: '#e0cec7',
      accent400: '#d2bab0',
      accent500: '#846358',
      accent600: '#a18072',
      accent700: '#977669',
      accent800: '#846358',
      accent900: '#43302b',
    },
  },
  branchBrownDark: {
    id: 'branchBrownDark',
    name: 'Branch Brown Dark',
    description: 'Dunkles Design mit Braun',
    colors: {
      ...darkModeBase,
      iconColor: '#846358',
      accent500: '#846358',
    },
  },
  // Growth Beige - Light & Dark
  growthBeige: {
    id: 'growthBeige',
    name: 'Growth Beige',
    description: 'Neutrales Beige',
    colors: {
      iconColor: '#5f5a50',
      accent50: '#faf9f7',
      accent100: '#e7e5df',
      accent200: '#d3cec4',
      accent300: '#b8b2a7',
      accent400: '#a39e93',
      accent500: '#5f5a50',
      accent600: '#6c665c',
      accent700: '#5f5a50',
      accent800: '#4e4a42',
      accent900: '#3e3b35',
    },
  },
  growthBeigeDark: {
    id: 'growthBeigeDark',
    name: 'Growth Beige Dark',
    description: 'Dunkles Design mit Beige',
    colors: {
      ...darkModeBase,
      iconColor: '#5f5a50',
      accent500: '#5f5a50',
    },
  },
  // Cortex Gray - Light & Dark
  cortexGray: {
    id: 'cortexGray',
    name: 'Cortex Gray',
    description: 'Elegantes Grau',
    colors: {
      iconColor: '#4b5563',
      accent50: '#f9fafb',
      accent100: '#f3f4f6',
      accent200: '#e5e7eb',
      accent300: '#d1d5db',
      accent400: '#9ca3af',
      accent500: '#4b5563',
      accent600: '#4b5563',
      accent700: '#374151',
      accent800: '#1f2937',
      accent900: '#111827',
    },
  },
  cortexGrayDark: {
    id: 'cortexGrayDark',
    name: 'Cortex Gray Dark',
    description: 'Dunkles Design mit Grau',
    colors: {
      ...darkModeBase,
      iconColor: '#4b5563',
      accent500: '#4b5563',
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
