import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import type { SummarizeStatus } from '../editor/useSummarize';

interface SummarizePreviewModalProps {
  status: SummarizeStatus;
  markdown: string;
  error: string;
  onClose: () => void;
  onReplace: () => void;
  onInsertBelow: () => void;
}

const SummarizePreviewModal = ({ status, markdown, error, onClose, onReplace, onInsertBelow }: SummarizePreviewModalProps) => (
  <Modal isOpen={status !== 'idle'} onClose={onClose} title="AI summary">
    {status === 'loading' && (
      <div className="flex items-center gap-3 py-6 text-sm text-(--ink-mid)">
        <Loader2 className="w-4 h-4 animate-spin" />
        Summarizing your note…
      </div>
    )}
    {status === 'error' && (
      <div className="space-y-4">
        <p className="text-sm text-(--danger)">{error}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    )}
    {status === 'done' && (
      <div className="space-y-4">
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-(--line-soft) p-3 text-sm whitespace-pre-wrap">
          {markdown}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn">Discard</button>
          <button onClick={onInsertBelow} className="btn">Insert below</button>
          <button onClick={onReplace} className="btn primary">Replace note</button>
        </div>
      </div>
    )}
  </Modal>
);

export default SummarizePreviewModal;
