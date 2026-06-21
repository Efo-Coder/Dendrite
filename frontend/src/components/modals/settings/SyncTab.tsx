import { useSettingsStore } from '../../../store/useSettingsStore';
import ToggleSwitch from '../../ui/ToggleSwitch';

// "Sync & Backup" settings pane: auto-save and local backup
const SyncTab = () => {
  const { autoSave, setAutoSave } = useSettingsStore();

  return (
    <>
      <div className="settings-row">
        <div className="lbl">Auto-save<small>Notes are saved automatically as you type.</small></div>
        <ToggleSwitch checked={autoSave} onChange={setAutoSave} />
      </div>
      <div className="settings-row">
        <div className="lbl">Local backup<small>Encrypted on disk.</small></div>
        <button className="btn-ghost" style={{ border: '0.5px solid var(--line)' }}>Export</button>
      </div>
    </>
  );
};

export default SyncTab;
