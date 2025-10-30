"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attachment_controller_1 = require("../controllers/attachment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_config_1 = require("../config/multer.config");
const router = (0, express_1.Router)();
// Alle Routes benötigen Authentifizierung
router.use(auth_middleware_1.authenticateToken);
// Attachment hochladen
router.post('/upload', multer_config_1.upload.single('file'), attachment_controller_1.uploadAttachment);
// Attachments für eine Notiz abrufen
router.get('/note/:noteId', attachment_controller_1.getAttachmentsByNoteId);
// Attachment löschen
router.delete('/:id', attachment_controller_1.deleteAttachment);
exports.default = router;
//# sourceMappingURL=attachment.routes.js.map