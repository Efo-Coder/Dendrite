import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildConstellationGraph } from '../services/constellation.service';
import { getConstellationNotes } from '../services/constellationNotes.service';

export const getConstellations = async (req: AuthRequest, res: Response) => {
  try {
    const graph = await buildConstellationGraph(req.userId!);
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
