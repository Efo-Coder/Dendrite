import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import Modal from './Modal';

interface TableInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: string, cols: string) => void;
}

const TableInsertModal = ({ isOpen, onClose, onInsert }: TableInsertModalProps) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const canInsert = rows > 0 && cols > 0;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Insert table">
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-(--ink) mb-2 uppercase tracking-wide">Rows</label>
            <div className="input flex items-center gap-1 px-2">
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setRows(Math.max(0, rows - 1))} className="transition-colors flex-shrink-0"><Minus className="w-3 h-3" /></button>
              <span className="flex-1 text-center text-sm tabular-nums">{rows}</span>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setRows(Math.min(20, rows + 1))} className="transition-colors flex-shrink-0"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-(--ink) mb-2 uppercase tracking-wide">Columns</label>
            <div className="input flex items-center gap-1 px-2">
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCols(Math.max(0, cols - 1))} className="transition-colors flex-shrink-0"><Minus className="w-3 h-3" /></button>
              <span className="flex-1 text-center text-sm tabular-nums">{cols}</span>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCols(Math.min(10, cols + 1))} className="transition-colors flex-shrink-0"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={() => { if (canInsert) onInsert(String(rows), String(cols)); }} className={clsx('btn', !canInsert && 'text-(--ink-low) pointer-events-none')}>Insert</button>
        </div>
      </div>
    </Modal>
  );
};

export default TableInsertModal;
