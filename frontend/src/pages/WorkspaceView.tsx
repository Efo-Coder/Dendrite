import { Note } from '../types';
import NoteEditor from '../components/editor/NoteEditor';

interface WorkspaceViewProps {
  note: Note;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

// The inline editor workspace: a note opened beside the AppSidebar inside the
// Home shell. The .win > .editor-panel wrapper mirrors what the .win-scoped
// editor panel CSS expects.
const WorkspaceView = ({ note, onToggleSidebar, sidebarCollapsed }: WorkspaceViewProps) => (
  <div className="win">
    <div className="editor-panel">
      <NoteEditor note={note} onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
    </div>
  </div>
);

export default WorkspaceView;
