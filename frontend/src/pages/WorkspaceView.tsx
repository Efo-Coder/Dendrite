import { Note } from '../types';
import NoteEditor from '../components/editor/NoteEditor';

interface WorkspaceViewProps {
  note: Note;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  // Restored on reload: the editor renders settled, without its entrance animation.
  instant?: boolean;
}

// The inline editor workspace: a note opened beside the AppSidebar inside the
// Home shell. The .win > .editor-panel wrapper mirrors what the .win-scoped
// editor panel CSS expects.
const WorkspaceView = ({ note, onToggleSidebar, sidebarCollapsed, instant }: WorkspaceViewProps) => (
  <div className="win">
    <div className="editor-panel">
      <NoteEditor note={note} onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} instant={instant} />
    </div>
  </div>
);

export default WorkspaceView;
