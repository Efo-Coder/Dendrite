"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderNotes = exports.toggleDelete = exports.toggleArchive = exports.toggleFavorite = exports.togglePin = exports.searchNotes = exports.deleteNote = exports.updateNote = exports.createNote = exports.getNoteById = exports.getAllNotes = void 0;
const index_1 = require("../index");
const getAllNotes = async (req, res) => {
    try {
        const { folderId, tagId, pinned, favorite, archived, deleted } = req.query;
        const where = { userId: req.userId };
        if (folderId)
            where.folderId = folderId;
        if (tagId)
            where.tags = { some: { id: tagId } };
        if (pinned !== undefined)
            where.isPinned = pinned === 'true';
        if (favorite !== undefined)
            where.isFavorite = favorite === 'true';
        if (archived !== undefined)
            where.isArchived = archived === 'true';
        if (deleted !== undefined)
            where.isDeleted = deleted === 'true';
        const notes = await index_1.prisma.note.findMany({
            where,
            include: {
                folder: true,
                tags: true,
                attachments: true,
            },
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        });
        // Bestimme den Kontext
        let contextType = 'all';
        let contextId = '_none';
        if (folderId) {
            contextType = 'folder';
            contextId = folderId;
        }
        else if (tagId) {
            contextType = 'tag';
            contextId = tagId;
        }
        else if (favorite === 'true') {
            contextType = 'favorites';
        }
        else if (archived === 'true') {
            contextType = 'archive';
        }
        // Für Papierkorb: Nach updatedAt DESC sortieren (neueste zuerst)
        // Für andere Ansichten: Kontextspezifische Reihenfolge verwenden
        if (deleted !== 'true' && notes.length > 0) {
            console.log('getAllNotes - Loading order for context:', { contextType, contextId, notesCount: notes.length });
            // Lade die NoteOrder Einträge NUR für diesen spezifischen Kontext
            const noteOrders = await index_1.prisma.noteOrder.findMany({
                where: {
                    userId: req.userId,
                    contextType,
                    contextId,
                    noteId: { in: notes.map(n => n.id) },
                },
            });
            console.log('Found noteOrders:', noteOrders.length);
            // Erstelle eine Map für schnellen Zugriff
            const orderMap = new Map(noteOrders.map(no => [no.noteId, no.order]));
            // Trenne Notizen mit und ohne gespeicherte Reihenfolge
            const notesWithOrder = notes.filter(n => orderMap.has(n.id));
            const notesWithoutOrder = notes.filter(n => !orderMap.has(n.id));
            // Sortiere Notizen MIT gespeicherter Reihenfolge
            notesWithOrder.sort((a, b) => {
                // Gepinnte zuerst
                if (a.isPinned && !b.isPinned)
                    return -1;
                if (!a.isPinned && b.isPinned)
                    return 1;
                // Dann nach custom order
                const orderA = orderMap.get(a.id);
                const orderB = orderMap.get(b.id);
                return orderA - orderB;
            });
            // Sortiere Notizen OHNE gespeicherte Reihenfolge nach updatedAt
            notesWithoutOrder.sort((a, b) => {
                // Gepinnte zuerst
                if (a.isPinned && !b.isPinned)
                    return -1;
                if (!a.isPinned && b.isPinned)
                    return 1;
                // Dann nach updatedAt
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
            // Kombiniere: Zuerst die mit Reihenfolge, dann die ohne
            notes.length = 0;
            notes.push(...notesWithOrder, ...notesWithoutOrder);
        }
        res.json({ notes });
    }
    catch (error) {
        console.error('GetAllNotes error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Notizen' });
    }
};
exports.getAllNotes = getAllNotes;
const getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await index_1.prisma.note.findFirst({
            where: {
                id,
                userId: req.userId,
            },
            include: {
                folder: true,
                tags: true,
                attachments: true,
            },
        });
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        res.json({ note });
    }
    catch (error) {
        console.error('GetNoteById error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Notiz' });
    }
};
exports.getNoteById = getNoteById;
const createNote = async (req, res) => {
    try {
        const { content, folderId, tags } = req.body;
        if (content === undefined || content === null) {
            return res.status(400).json({ error: 'Inhalt ist erforderlich' });
        }
        const note = await index_1.prisma.note.create({
            data: {
                content,
                userId: req.userId,
                folderId: folderId || null,
                tags: tags
                    ? {
                        connect: tags.map((tagId) => ({ id: tagId })),
                    }
                    : undefined,
            },
            include: {
                folder: true,
                tags: true,
                attachments: true,
            },
        });
        res.status(201).json({ note });
    }
    catch (error) {
        console.error('CreateNote error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen der Notiz' });
    }
};
exports.createNote = createNote;
const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, folderId, tags } = req.body;
        // Prüfe ob Notiz existiert und dem User gehört
        const existingNote = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existingNote) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        const note = await index_1.prisma.note.update({
            where: { id },
            data: {
                content: content !== undefined ? content : existingNote.content,
                folderId: folderId !== undefined ? folderId : existingNote.folderId,
                tags: tags
                    ? {
                        set: tags.map((tagId) => ({ id: tagId })),
                    }
                    : undefined,
            },
            include: {
                folder: true,
                tags: true,
                attachments: true,
            },
        });
        res.json({ note });
    }
    catch (error) {
        console.error('UpdateNote error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Notiz' });
    }
};
exports.updateNote = updateNote;
const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        // Prüfe ob Notiz existiert und dem User gehört
        const existingNote = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existingNote) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        await index_1.prisma.note.delete({ where: { id } });
        res.json({ message: 'Notiz erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('DeleteNote error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
    }
};
exports.deleteNote = deleteNote;
const searchNotes = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Suchbegriff erforderlich' });
        }
        const notes = await index_1.prisma.note.findMany({
            where: {
                userId: req.userId,
                content: { contains: q, mode: 'insensitive' },
            },
            include: {
                folder: true,
                tags: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ notes });
    }
    catch (error) {
        console.error('SearchNotes error:', error);
        res.status(500).json({ error: 'Fehler bei der Suche' });
    }
};
exports.searchNotes = searchNotes;
const togglePin = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        const updatedNote = await index_1.prisma.note.update({
            where: { id },
            data: { isPinned: !note.isPinned },
            include: {
                folder: true,
                tags: true,
            },
        });
        res.json({ note: updatedNote });
    }
    catch (error) {
        console.error('TogglePin error:', error);
        res.status(500).json({ error: 'Fehler beim Pinnen der Notiz' });
    }
};
exports.togglePin = togglePin;
const toggleFavorite = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        const updatedNote = await index_1.prisma.note.update({
            where: { id },
            data: { isFavorite: !note.isFavorite },
            include: {
                folder: true,
                tags: true,
            },
        });
        res.json({ note: updatedNote });
    }
    catch (error) {
        console.error('ToggleFavorite error:', error);
        res.status(500).json({ error: 'Fehler beim Favorisieren der Notiz' });
    }
};
exports.toggleFavorite = toggleFavorite;
const toggleArchive = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        const updatedNote = await index_1.prisma.note.update({
            where: { id },
            data: { isArchived: !note.isArchived },
            include: {
                folder: true,
                tags: true,
            },
        });
        res.json({ note: updatedNote });
    }
    catch (error) {
        console.error('ToggleArchive error:', error);
        res.status(500).json({ error: 'Fehler beim Archivieren der Notiz' });
    }
};
exports.toggleArchive = toggleArchive;
const toggleDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await index_1.prisma.note.findFirst({
            where: { id, userId: req.userId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        const updatedNote = await index_1.prisma.note.update({
            where: { id },
            data: { isDeleted: !note.isDeleted },
            include: {
                folder: true,
                tags: true,
            },
        });
        res.json({ note: updatedNote });
    }
    catch (error) {
        console.error('ToggleDelete error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
    }
};
exports.toggleDelete = toggleDelete;
const reorderNotes = async (req, res) => {
    try {
        const { noteOrders, contextType, contextId } = req.body;
        console.log('ReorderNotes called with:', { contextType, contextId, noteOrdersCount: noteOrders?.length });
        if (!Array.isArray(noteOrders)) {
            return res.status(400).json({ error: 'noteOrders muss ein Array sein' });
        }
        if (!contextType) {
            return res.status(400).json({ error: 'contextType ist erforderlich' });
        }
        // Speichere die Reihenfolge für jeden Kontext
        await index_1.prisma.$transaction(noteOrders.map((item) => index_1.prisma.noteOrder.upsert({
            where: {
                noteId_userId_contextType_contextId: {
                    noteId: item.id,
                    userId: req.userId,
                    contextType,
                    contextId: contextId || '_none',
                },
            },
            create: {
                noteId: item.id,
                userId: req.userId,
                contextType,
                contextId: contextId || '_none',
                order: item.order,
            },
            update: {
                order: item.order,
            },
        })));
        res.json({ message: 'Reihenfolge erfolgreich aktualisiert' });
    }
    catch (error) {
        console.error('ReorderNotes error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
    }
};
exports.reorderNotes = reorderNotes;
//# sourceMappingURL=note.controller.js.map