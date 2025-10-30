"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttachmentsByNoteId = exports.deleteAttachment = exports.uploadAttachment = void 0;
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadAttachment = async (req, res) => {
    try {
        const { noteId } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }
        if (!noteId) {
            // Datei löschen, wenn keine noteId vorhanden ist
            fs_1.default.unlinkSync(file.path);
            return res.status(400).json({ error: 'noteId ist erforderlich' });
        }
        // Prüfen, ob die Notiz existiert
        const note = await database_1.prisma.note.findUnique({
            where: { id: noteId },
        });
        if (!note) {
            // Datei löschen, wenn Notiz nicht existiert
            fs_1.default.unlinkSync(file.path);
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        // Attachment in Datenbank erstellen
        const attachment = await database_1.prisma.attachment.create({
            data: {
                filename: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                url: `/uploads/${file.filename}`,
                noteId: noteId,
            },
        });
        res.status(201).json(attachment);
    }
    catch (error) {
        console.error('Fehler beim Hochladen der Datei:', error);
        // Datei löschen bei Fehler
        if (req.file) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (unlinkError) {
                console.error('Fehler beim Löschen der Datei:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.uploadAttachment = uploadAttachment;
const deleteAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        // Attachment abrufen
        const attachment = await database_1.prisma.attachment.findUnique({
            where: { id },
        });
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment nicht gefunden' });
        }
        // Datei vom Dateisystem löschen
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        const filename = attachment.url.replace('/uploads/', '');
        const filePath = path_1.default.join(uploadsDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Attachment aus Datenbank löschen
        await database_1.prisma.attachment.delete({
            where: { id },
        });
        res.status(200).json({ message: 'Attachment erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Attachments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.deleteAttachment = deleteAttachment;
const getAttachmentsByNoteId = async (req, res) => {
    try {
        const { noteId } = req.params;
        const attachments = await database_1.prisma.attachment.findMany({
            where: { noteId },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(attachments);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Attachments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.getAttachmentsByNoteId = getAttachmentsByNoteId;
//# sourceMappingURL=attachment.controller.js.map