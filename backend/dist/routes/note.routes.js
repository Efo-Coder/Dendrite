"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const note_controller_1 = require("../controllers/note.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Alle Routes benötigen Authentifizierung
router.use(auth_middleware_1.authenticateToken);
router.get('/', note_controller_1.getAllNotes);
router.get('/search', note_controller_1.searchNotes);
router.get('/:id', note_controller_1.getNoteById);
router.post('/', note_controller_1.createNote);
router.post('/reorder', note_controller_1.reorderNotes);
router.put('/:id', note_controller_1.updateNote);
router.delete('/:id', note_controller_1.deleteNote);
router.patch('/:id/pin', note_controller_1.togglePin);
router.patch('/:id/favorite', note_controller_1.toggleFavorite);
router.patch('/:id/archive', note_controller_1.toggleArchive);
router.patch('/:id/trash', note_controller_1.toggleDelete);
exports.default = router;
//# sourceMappingURL=note.routes.js.map