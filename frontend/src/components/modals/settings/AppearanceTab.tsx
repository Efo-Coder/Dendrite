import { useSettingsStore, PaletteId, DensityId, DateDisplayMode, CursorStyle } from '../../../store/useSettingsStore';

const PALETTES: { id: PaletteId; name: string; color: string }[] = [
  { id: 'onyx',     name: 'Onyx & Champagne', color: 'oklch(0.2253 0.0084 79.15)'  },
  { id: 'bordeaux', name: 'Bordeaux & Cream',  color: 'oklch(0.1518 0.0947 25)'  },
  { id: 'forest',   name: 'Forest & Brass',    color: 'oklch(0.2341 0.0306 165)' },
  { id: 'midnight', name: 'Midnight & Rose',   color: 'oklch(0.2341 0.038 260)' },
  { id: 'obsidian', name: 'Obsidian & Ivory',  color: 'oklch(0.3056 0.006 0)'  },
  { id: 'nacre',    name: 'Nacre & Rose Gold', color: 'oklch(0.2724 0.0429 15)'  },
];

const DENSITIES: { id: DensityId; label: string }[] = [
  { id: 'compact', label: 'compact' },
  { id: 'regular', label: 'regular' },
  { id: 'comfy',   label: 'comfy' },
];

// "Appearance" settings pane: theme, palette, date display, density and cursor
const AppearanceTab = () => {
  const {
    palette, setPalette,
    themeMode, setThemeMode,
    density, setDensity,
    dateDisplayMode, setDateDisplayMode,
    cursorStyle, setCursorStyle,
  } = useSettingsStore();

  return (
    <>
      <div className="settings-row">
        <div className="lbl">Theme<small>Light for daylight; dark for the small hours.</small></div>
        <button
          className="btn-toggle fill-slide"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
        >
          {themeMode === 'dark' ? '◑ Dark' : '○ Light'}
        </button>
      </div>

      <div className="settings-row">
        <div className="lbl">Palette<small>A small library of disciplined moods.</small></div>
        <div className="swatch-row">
          {PALETTES.map((p) => (
            <div
              key={p.id}
              className={`swatch${palette === p.id ? ' active' : ''}`}
              style={{ background: p.color }}
              title={p.name}
              onClick={() => setPalette(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="lbl">Date display<small>Which date to show in the notes list.</small></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['updatedAt', 'Edited'], ['createdAt', 'Created']] as [DateDisplayMode, string][]).map(([id, label]) => (
            <button
              key={id}
              className={`btn-toggle fill-slide${dateDisplayMode === id ? ' active' : ''}`}
              onClick={() => setDateDisplayMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="lbl">Density<small>How much air between the words.</small></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              className={`btn-toggle fill-slide${density === d.id ? ' active' : ''}`}
              onClick={() => setDensity(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="lbl">Cursor<small>Gold arrow or floating dot & ring.</small></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['classic', 'Classic'], ['modern', 'Modern']] as [CursorStyle, string][]).map(([id, label]) => (
            <button
              key={id}
              className={`btn-toggle fill-slide${cursorStyle === id ? ' active' : ''}`}
              onClick={() => setCursorStyle(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default AppearanceTab;
