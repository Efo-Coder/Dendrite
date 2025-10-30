"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tag_controller_1 = require("../controllers/tag.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/', tag_controller_1.getAllTags);
router.get('/:id', tag_controller_1.getTagById);
router.post('/', tag_controller_1.createTag);
router.put('/:id', tag_controller_1.updateTag);
router.delete('/:id', tag_controller_1.deleteTag);
exports.default = router;
//# sourceMappingURL=tag.routes.js.map