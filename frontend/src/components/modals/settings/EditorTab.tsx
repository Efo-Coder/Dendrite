import { useSettingsStore } from '../../../store/useSettingsStore';
import ToggleSwitch from '../../ui/ToggleSwitch';
import RangeSlider from '../../ui/RangeSlider';
import Counter from '../../ui/Counter';
import SettingsFontDropdown from './SettingsFontDropdown';

// "Editor" settings pane: typeface, type size, drop cap and active line
const EditorTab = () => {
  const {
    fontSize, setFontSize,
    dropCap, setDropCap,
    activeLine, setActiveLine,
  } = useSettingsStore();

  return (
    <>
      <div className="settings-row">
        <div className="lbl">Typeface<small>For the title page and the running text.</small></div>
        <SettingsFontDropdown />
      </div>

      <div className="settings-row">
        <div className="lbl">Type size<small>From whisper to lectern.</small></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RangeSlider
            min={14} max={28} step={1} value={fontSize}
            onChange={setFontSize}
          />
          <span style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-low)', width: 32 }}>
            <Counter
              value={fontSize}
              places={[10, 1]}
              fontSize={11}
              gap={0}
              borderRadius={0}
              horizontalPadding={0}
              textColor="var(--ink-low)"
              fontWeight={400}
              gradientHeight={0}
              counterStyle={{ fontFamily: 'var(--mono)' }}
            />
            px
          </span>
        </div>
      </div>

      <div className="settings-row">
        <div className="lbl">Drop cap<small>The luxurious first letter.</small></div>
        <ToggleSwitch checked={dropCap} onChange={setDropCap} />
      </div>

      <div className="settings-row">
        <div className="lbl">Active line<small>Highlight the line under the cursor.</small></div>
        <ToggleSwitch checked={activeLine} onChange={setActiveLine} />
      </div>
    </>
  );
};

export default EditorTab;
