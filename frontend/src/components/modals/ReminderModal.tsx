import { useEffect, useState } from 'react';
import { AlarmClock, Trash2, Repeat } from 'lucide-react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { Reminder, Recurrence } from '../../types';
import { reminderService } from '../../services/reminder.service';
import { useToast } from '../ui/ToastContainer';
import { getApiErrorMessage } from '../../lib/apiError';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Local wall-clock value for <input type="datetime-local"> (no timezone suffix).
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inOneHour(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

const ReminderModal = ({ isOpen, onClose, noteId }: ReminderModalProps) => {
  const toast = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState(toLocalInputValue(inOneHour()));
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDescription('');
    setRemindAt(toLocalInputValue(inOneHour()));
    setRecurrence('none');
    setError('');
    reminderService.list(noteId).then(setReminders).catch(() => {});
  }, [isOpen, noteId]);

  // Quick presets just seed the datetime-local field; the field stays the source of truth.
  const applyPreset = (date: Date) => setRemindAt(toLocalInputValue(date));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please describe what to remind you of');
      return;
    }
    const when = new Date(remindAt);
    if (Number.isNaN(when.getTime())) {
      setError('Please pick a valid date and time');
      return;
    }
    if (when.getTime() <= Date.now()) {
      setError('Pick a time in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await reminderService.create({
        noteId,
        description: description.trim(),
        remindAt: when.toISOString(),
        recurrence,
      });
      setReminders(prev => [...prev, created].sort((a, b) => a.remindAt.localeCompare(b.remindAt)));
      setDescription('');
      toast.success('Reminder set');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create reminder'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    try {
      await reminderService.remove(id);
    } catch {
      toast.error('Could not delete reminder');
    }
  };

  const tomorrowMorning = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set a Reminder">
      <form onSubmit={handleCreate}>
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="reminder-desc" className="modal-label">Remind me to…</label>
          <MagicInput
            id="reminder-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="modal-input"
            placeholder="e.g. Follow up on this idea"
            maxLength={140}
            autoFocus
            required
            wrapperStyle={{ borderRadius: '10px' }}
          />
        </div>

        <div className="modal-field" style={{ marginTop: '12px' }}>
          <label className="modal-label">When</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button type="button" className="px-2.5 py-1 rounded-full border border-(--line) text-xs text-(--ink-mid) transition-colors hover:bg-(--surface-hi) hover:text-(--ink)" onClick={() => applyPreset(new Date(Date.now() + 60 * 60 * 1000))}>In 1 hour</button>
            <button type="button" className="px-2.5 py-1 rounded-full border border-(--line) text-xs text-(--ink-mid) transition-colors hover:bg-(--surface-hi) hover:text-(--ink)" onClick={() => applyPreset(new Date(Date.now() + 3 * 60 * 60 * 1000))}>In 3 hours</button>
            <button type="button" className="px-2.5 py-1 rounded-full border border-(--line) text-xs text-(--ink-mid) transition-colors hover:bg-(--surface-hi) hover:text-(--ink)" onClick={() => applyPreset(tomorrowMorning)}>Tomorrow 9:00</button>
          </div>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className="modal-input"
            min={toLocalInputValue(new Date())}
          />
        </div>

        <div className="modal-field" style={{ marginTop: '12px' }}>
          <label htmlFor="reminder-recurrence" className="modal-label">Repeat</label>
          <select
            id="reminder-recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className="modal-input"
          >
            {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map(r => (
              <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div className="modal-form-ft">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
            Close
          </button>
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Setting…' : 'Set reminder'}
          </button>
        </div>
      </form>

      {reminders.length > 0 && (
        <div className="modal-field" style={{ marginTop: '4px', borderTop: '1px solid var(--line-soft)', paddingTop: '14px' }}>
          <label className="modal-label">Scheduled</label>
          <ul className="space-y-1">
            {reminders.map(r => (
              <li key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-(--surface-hi)">
                <AlarmClock className="w-4 h-4 shrink-0 text-(--accent)" />
                <div className="min-w-0 grow">
                  <p className="text-sm text-(--ink) truncate">{r.description}</p>
                  <p className="text-xs text-(--ink-mid) flex items-center gap-1.5">
                    {new Date(r.remindAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    {r.recurrence !== 'none' && (
                      <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{RECURRENCE_LABELS[r.recurrence]}</span>
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => handleDelete(r.id)} className="icon-btn-md rounded-lg shrink-0" title="Delete reminder">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
};

export default ReminderModal;
