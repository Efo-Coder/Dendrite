import { useState, useEffect } from 'react';
import { X, Loader2, ImageOff, Globe } from 'lucide-react';
import clsx from 'clsx';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { Note, PublishedNote } from '../../types';
import { publishedService } from '../../services/published.service';
import { EXPLORE_TOPICS } from '../../lib/exploreTopics';
import { useToast } from '../ui/ToastContainer';
import { getApiErrorMessage } from '../../lib/apiError';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveCover = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

// Minimum time the confirm button stays in its loading state, so the spinner
// reads as an intentional moment rather than flickering on fast responses.
const MIN_SUBMIT_MS = 800;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onPublishedChange?: (published: boolean) => void;
}

const PublishModal = ({ isOpen, onClose, note, onPublishedChange }: Props) => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<PublishedNote | null>(null);
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [useCover, setUseCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  // Load publication status on open and pre-fill the form from it (or from the note).
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    publishedService
      .getStatus(note.id)
      .then((pub) => {
        setExisting(pub);
        setDescription(pub?.description ?? '');
        setTopics(pub?.topics ?? []);
        setTags(pub ? pub.tags : (note.tags?.map((t) => t.name) ?? []));
        setUseCover(pub ? !!pub.coverImage : !!note.coverImage);
      })
      .catch(() => toast.error('Could not load publication status'))
      .finally(() => setLoading(false));
  }, [isOpen, note.id]);

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t]);
    setTopicInput('');
  };

  // Curated topics plus any custom ones already chosen, so newly created topics
  // show up as selectable chips alongside the predefined set.
  const topicOptions = [
    ...EXPLORE_TOPICS,
    ...topics.filter((t) => !(EXPLORE_TOPICS as readonly string[]).includes(t)),
  ];

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Promise.all so a real error still rejects immediately, but a successful
      // publish always holds the spinner for at least MIN_SUBMIT_MS.
      await Promise.all([
        publishedService.publish(note.id, {
          description: description.trim(),
          coverImage: useCover ? (note.coverImage ?? null) : null,
          tags,
          topics,
        }),
        new Promise((resolve) => setTimeout(resolve, MIN_SUBMIT_MS)),
      ]);
      toast.success(existing ? 'Publication updated' : 'Published');
      onPublishedChange?.(true);
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not publish note'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    try {
      await publishedService.unpublish(note.id);
      toast.info('Unpublished');
      onPublishedChange?.(false);
      onClose();
    } catch {
      toast.error('Could not unpublish note');
    } finally {
      setUnpublishing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish"
      showFooter
      confirmLabel={existing ? 'Update' : 'Publish'}
      confirmingLabel={existing ? 'Updating' : 'Publishing'}
      onConfirm={handleSubmit}
      confirmDisabled={loading}
      isConfirming={submitting}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-(--ink-dim)" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="flex items-start gap-2 text-sm text-(--ink-mid)">
            <Globe className="w-4 h-4 shrink-0 mt-0.5 text-(--accent)" />
            <span>
              A read-only copy appears in Explore. Edits to your note stay private until you update
              the publication.
            </span>
          </p>

          {/* Cover */}
          <div>
            <span className="mb-2 block modal-label">Cover image</span>
            {note.coverImage ? (
              <button
                type="button"
                onClick={() => setUseCover((v) => !v)}
                className={clsx(
                  'relative block w-full overflow-hidden rounded-xl border transition-colors',
                  useCover ? 'border-(--accent)' : 'border-(--line)',
                )}
              >
                <img
                  src={resolveCover(note.coverImage)}
                  alt=""
                  className={clsx(
                    'h-28 w-full object-cover transition-opacity',
                    useCover ? 'opacity-100' : 'opacity-40',
                  )}
                />
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white">
                  {useCover ? 'Used as cover' : 'Hidden'}
                </span>
              </button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-(--ink-dim)">
                <ImageOff className="w-4 h-4 shrink-0" />
                This note has no cover image.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <span className="mb-2 block modal-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A sentence on what this note explores…"
              rows={3}
              className="modal-input resize-none"
            />
          </div>

          {/* Topics */}
          <div>
            <span className="mb-2 block modal-label">Topics</span>
            <div className="flex flex-wrap gap-2">
              {topicOptions.map((t) => {
                const active = topics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={clsx(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      active
                        ? 'border-(--accent) text-(--accent)'
                        : 'border-(--line) text-(--ink-mid) hover:text-(--ink)',
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <MagicInput
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="Add a topic and press Enter"
              className="modal-input"
              wrapperClassName="mt-2"
              wrapperStyle={{ borderRadius: '10px' }}
            />
          </div>

          {/* Tags */}
          <div>
            <span className="mb-2 block modal-label">Tags</span>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full border border-(--line) px-2.5 py-1 text-xs text-(--ink-mid)"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="text-(--ink-dim) hover:text-(--ink) transition-colors"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <MagicInput
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              className="modal-input"
              wrapperStyle={{ borderRadius: '10px' }}
            />
          </div>

          {/* Unpublish */}
          {existing && (
            <div className="flex justify-center border-t border-(--line) pt-4">
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={unpublishing}
                className="flex items-center gap-1.5 text-sm text-(--ink) hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {unpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Remove from Explore
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default PublishModal;
