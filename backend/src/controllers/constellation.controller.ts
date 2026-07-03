import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TtlCache } from '../lib/ttlCache';
import { buildConstellationGraph } from '../services/constellation.service';
import { getConstellationNotes } from '../services/constellationNotes.service';
import type { ConstellationGraphDTO } from '../services/constellation.service';

// The graph tokenizes the user's entire corpus per build — far too heavy to
// redo on every open. Themes shift over hours, not seconds, so a short TTL
// keeps the view fresh enough without an invalidation web across controllers.
const graphCache = new TtlCache<ConstellationGraphDTO>(5 * 60_000);

export const getConstellations = async (req: AuthRequest, res: Response) => {
  try {
    const graph = await graphCache.getOrBuild(req.userId!, () => buildConstellationGraph(req.userId!));
    return res.json(graph);
  } catch (error) {
    console.error('GetConstellations error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen der Konstellationen' });
  }
};

export const getThemeNotes = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const notes = await getConstellationNotes(req.userId!, id);
    return res.json({ notes });
  } catch (error) {
    console.error('GetThemeNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Laden der Notizen' });
  }
};
