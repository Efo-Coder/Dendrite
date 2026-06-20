import { useState } from 'react';
import { Note, PublishedNote } from '../../types';
import { publishedService } from '../../services/published.service';
import { noteService } from '../../services/note.service';
import { useToast } from '../ui/ToastContainer';
import { getApiErrorMessage } from '../../lib/apiError';

// Copy a published note into the user's own workspace as a fully independent note
// (no link back). Shared by Explore and profile pages.
export function usePublishedCopy(onOpenInline: (note: Note) => void) {
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const toast = useToast();

  const copy = async (pub: PublishedNote) => {
    setCopyingId(pub.id);
    try {
      // List cards omit content; fetch the full publication when copying from one.
      const full = pub.content !== undefined ? pub : await publishedService.getById(pub.id);
      const note = await noteService.createNote({ title: full.title ?? '', content: full.content ?? '' });
      toast.success('Copied to your workspace');
      onOpenInline(note);
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not copy note'));
    } finally {
      setCopyingId(null);
    }
  };

  return { copyingId, copy };
}
