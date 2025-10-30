"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const folder_controller_1 = require("../controllers/folder.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/', folder_controller_1.getAllFolders);
router.get('/:id', folder_controller_1.getFolderById);
router.post('/', folder_controller_1.createFolder);
router.put('/:id', folder_controller_1.updateFolder);
router.delete('/:id', folder_controller_1.deleteFolder);
exports.default = router;
//# sourceMappingURL=folder.routes.js.map