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
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    brandPrimary: string;
  };
}

// Dark Mode Basis-Farben (verwendet für alle Dark Themes)
const darkModeBase = {
  iconPrimary: '#a3a3a3',       // Primäre Icon-Farbe (Baum)
  iconSecondary: '#737373',     // Sekundäre Icon-Farbe (Ring)
  bgPrimary: '#141414',         // Primärer Hintergrund
  bgPrimaryVariant: '#a3a3a3',  // Sekundärer Hintergrund
  bgPrimarySurface: '#222222',  // Tertiärer Hintergrund
  bgSecondary: '#222222',       // Flächen (z.B. NoteList, NoteEditor, Sidebar)
  bgHeader: '#141414',          // Header-Hintergrund
  bgInput: '#222222',           // Hintergrund für Input-Felder
  textPrimary: '#e5e5e5',       // Primärer Text
  textSecondary: '#a3a3a3',     // Sekundärer Text
  textMuted: '#737373',         // Muted Text
  brandPrimary: '#a3a3a3',      // Highlight/Brand-Farbe (z.B. Links, Buttons)
};

export const themes: Record<string, Theme> = {
  // Sprout Green - Light & Dark
  sproutGreen: {
    id: 'sproutGreen',
    name: 'Sprout Green',
    description: 'Sanftes Pastell-Grün',
    colors: {
      iconPrimary: '#4ade80',
      iconSecondary: '#4ade80',
      bgPrimary: '#f0fdf4',
      bgPrimaryVariant: '#d77539',
      bgPrimarySurface: '#5de8f5',
      bgSecondary: '#ffffff4e',
      bgHeader: '#eef6f15b',
      bgInput: '#00000070',
      textPrimary: '#ffffff',
      textSecondary: '#166534',
      textMuted: '#4ade80',
      brandPrimary: '#4ade80',
    },
  },
  sproutGreenDark: {
    id: 'sproutGreenDark',
    name: 'Sprout Green Dark',
    description: 'Dunkles Design mit Grün',
    colors: {
      ...darkModeBase,
      iconPrimary: '#10b981',
      brandPrimary: '#10b981',
    },
  },
  // Blossom Pink - Light & Dark
  blossomPink: {
    id: 'blossomPink',
    name: 'Blossom Rose',
    description: 'Zartes Rosa-Design',
    colors: {
      iconPrimary: '#f472b6',
      iconSecondary: '#be185d',
      bgPrimary: '#fdf2f8',
      bgPrimaryVariant: '#fce7f3',
      bgPrimarySurface: '#fce7f3',
      bgSecondary: '#fce7f3',
      bgHeader: '#fdf2f8',
      bgInput: '#fce7f3',
      textPrimary: '#831843',
      textSecondary: '#9d174d',
      textMuted: '#f472b6',
      brandPrimary: '#f472b6',
    },
  },
  blossomPinkDark: {
    id: 'blossomPinkDark',
    name: 'Blossom Rose Dark',
    description: 'Dunkles Design mit Rosa',
    colors: {
      ...darkModeBase,
      iconPrimary: '#f472b6',
      brandPrimary: '#f472b6',
    },
  },
  // Neural Blue - Light & Dark
  neuralBlue: {
    id: 'neuralBlue',
    name: 'Neural Blue',
    description: 'Beruhigendes Blau',
    colors: {
      iconPrimary: '#93c5fd',
      iconSecondary: '#1d4ed8',
      bgPrimary: '#eff6ff',
      bgPrimaryVariant: '#dbeafe',
      bgPrimarySurface: '#dbeafe',
      bgSecondary: '#dbeafe',
      bgHeader: '#eff6ff',
      bgInput: '#dbeafe',
      textPrimary: '#1e3a8a',
      textSecondary: '#1e40af',
      textMuted: '#60a5fa',
      brandPrimary: '#93c5fd',
    },
  },
  neuralBlueDark: {
    id: 'neuralBlueDark',
    name: 'Neural Blue Dark',
    description: 'Dunkles Design mit Blau',
    colors: {
      ...darkModeBase,
      iconPrimary: '#93c5fd',
      brandPrimary: '#93c5fd',
    },
  },
  // Synapse Cream - Light & Dark
  synapseCream: {
    id: 'synapseCream',
    name: 'Synapse Cream',
    description: 'Warmes Creme-Design',
    colors: {
      iconPrimary: '#eab308',
      iconSecondary: '#a16207',
      bgPrimary: '#fefce8',
      bgPrimaryVariant: '#fef9c3',
      bgPrimarySurface: '#fef9c3',
      bgSecondary: '#fef9c3',
      bgHeader: '#fefce8',
      bgInput: '#fef9c3',
      textPrimary: '#713f12',
      textSecondary: '#854d0e',
      textMuted: '#facc15',
      brandPrimary: '#eab308',
    },
  },
  synapseCreamDark: {
    id: 'synapseCreamDark',
    name: 'Synapse Cream Dark',
    description: 'Dunkles Design mit Gelb',
    colors: {
      ...darkModeBase,
      iconPrimary: '#eab308',
      brandPrimary: '#eab308',
    },
  },
  // Pulse Orange - Light & Dark
  pulseOrange: {
    id: 'pulseOrange',
    name: 'Pulse Orange',
    description: 'Energetisches Orange',
    colors: {
      iconPrimary: '#fb923c',
      iconSecondary: '#c2410c',
      bgPrimary: '#fff7ed',
      bgPrimaryVariant: '#ffedd5',
      bgPrimarySurface: '#ffedd5',
      bgSecondary: '#ffedd5',
      bgHeader: '#fff7ed',
      bgInput: '#ffedd5',
      textPrimary: '#7c2d12',
      textSecondary: '#9a3412',
      textMuted: '#fb923c',
      brandPrimary: '#fb923c',
    },
  },
  pulseOrangeDark: {
    id: 'pulseOrangeDark',
    name: 'Pulse Orange Dark',
    description: 'Dunkles Design mit Orange',
    colors: {
      ...darkModeBase,
      iconPrimary: '#fb923c',
      brandPrimary: '#fb923c',
    },
  },
  // Branch Brown - Light & Dark
  branchBrown: {
    id: 'branchBrown',
    name: 'Branch Brown',
    description: 'Erdiges Braun',
    colors: {
      iconPrimary: '#c8957f',
      iconSecondary: '#977669',
      bgPrimary: '#fdf8f6',
      bgPrimaryVariant: '#f2e8e5',
      bgPrimarySurface: '#f2e8e5',
      bgSecondary: '#f2e8e5',
      bgHeader: '#fdf8f6',
      bgInput: '#f2e8e5',
      textPrimary: '#43302b',
      textSecondary: '#846358',
      textMuted: '#d2bab0',
      brandPrimary: '#c8957f',
    },
  },
  branchBrownDark: {
    id: 'branchBrownDark',
    name: 'Branch Brown Dark',
    description: 'Dunkles Design mit Braun',
    colors: {
      ...darkModeBase,
      iconPrimary: '#c8957f',
      brandPrimary: '#c8957f',
    },
  },
  // Growth Beige - Light & Dark
  growthBeige: {
    id: 'growthBeige',
    name: 'Growth Beige',
    description: 'Neutrales Beige',
    colors: {
      iconPrimary: '#4d3823',
      iconSecondary: '#5f5a50',
      bgPrimary: '#efece5',
      bgPrimaryVariant: '#a89888',
      bgPrimarySurface: '#ffffff',
      bgSecondary: '#e7e5df',
      bgHeader: '#fffbf476',
      bgInput: '#e7e5dfa2',
      textPrimary: '#3e3b35',
      textSecondary: '#4e4a42',
      textMuted: '#a39e93',
      brandPrimary: '#a0866f',
    },
  },
  growthBeigeDark: {
    id: 'growthBeigeDark',
    name: 'Growth Beige Dark',
    description: 'Dunkles Design mit Beige',
    colors: {
      ...darkModeBase,
      iconPrimary: '#a89888',
      brandPrimary: '#a89888',
    },
  },
  // Cortex Gray - Light & Dark
  cortexGray: {
    id: 'cortexGray',
    name: 'Cortex Gray',
    description: 'Elegantes Grau',
    colors: {
      iconPrimary: '#8892a2',
      iconSecondary: '#374151',
      bgPrimary: '#f9fafb',
      bgPrimaryVariant: '#f3f4f6',
      bgPrimarySurface: '#f3f4f6',
      bgSecondary: '#f3f4f6',
      bgHeader: '#f9fafb',
      bgInput: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#1f2937',
      textMuted: '#9ca3af',
      brandPrimary: '#8892a2',
    },
  },
  cortexGrayDark: {
    id: 'cortexGrayDark',
    name: 'Cortex Gray Dark',
    description: 'Dunkles Design mit Grau',
    colors: {
      ...darkModeBase,
      iconPrimary: '#8892a2',
      brandPrimary: '#8892a2',
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
