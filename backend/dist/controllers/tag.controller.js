"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTag = exports.updateTag = exports.createTag = exports.getTagById = exports.getAllTags = void 0;
const index_1 = require("../index");
const getAllTags = async (req, res) => {
    try {
        const tags = await index_1.prisma.tag.findMany({
            where: { userId: req.userId },
            include: {
                notes: {
                    where: {
                        isDeleted: false,
                        isArchived: false,
                    },
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        res.json({ tags });
    }
    catch (error) {
        console.error('GetAllTags error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Tags' });
    }
};
exports.getAllTags = getAllTags;
const getTagById = async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await index_1.prisma.tag.findFirst({
            where: {
                id,
                userId: req.userId,
            },
            include: {
                notes: true,
            },
        });
        if (!tag) {
            return res.status(404).json({ error: 'Tag nicht gefunden' });
        }
        res.json({ tag });
    }
    catch (error) {
        console.error('GetTagById error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Tags' });
    }
};
exports.getTagById = getTagById;
const createTag = async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name ist erforderlich' });
        }
        const tag = await index_1.prisma.tag.create({
            data: {
                name,
                color: color || '#10b981',
                userId: req.userId,
            },
        });
        res.status(201).json({ tag });
    }
    catch (error) {
        console.error('CreateTag error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Tags' });
    }
};
exports.createTag = createTag;
const updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;
        const existingTag = await index_1.prisma.tag.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existingTag) {
            return res.status(404).json({ error: 'Tag nicht gefunden' });
        }
        const tag = await index_1.prisma.tag.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existingTag.name,
                color: color !== undefined ? color : existingTag.color,
            },
        });
        res.json({ tag });
    }
    catch (error) {
        console.error('UpdateTag error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Tags' });
    }
};
exports.updateTag = updateTag;
const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const existingTag = await index_1.prisma.tag.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existingTag) {
            return res.status(404).json({ error: 'Tag nicht gefunden' });
        }
        await index_1.prisma.tag.delete({ where: { id } });
        res.json({ message: 'Tag erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('DeleteTag error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Tags' });
    }
};
exports.deleteTag = deleteTag;
//# sourceMappingURL=tag.controller.js.map