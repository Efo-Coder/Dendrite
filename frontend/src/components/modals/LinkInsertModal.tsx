import Modal from './Modal';

interface LinkInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  onSubmit: () => void;
}

const LinkInsertModal = ({ isOpen, onClose, linkUrl, setLinkUrl, onSubmit }: LinkInsertModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Link hinzufügen">
    <div className="mb-5">
      <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">URL</label>
      <input
        type="url"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="https://example.com"
        className="input w-full text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
    </div>
    <div className="flex justify-end space-x-2">
      <button onClick={onClose} className="px-4 py-2 text-sm btn-themed transition-all relative group">
        <span className="relative">Abbrechen</span>
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button onClick={onSubmit} disabled={!linkUrl.trim()} className="px-4 py-2 text-sm btn-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed">
        <span className="relative">Hinzufügen</span>
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity" />
      </button>
    </div>
  </Modal>
);

export default LinkInsertModal;
