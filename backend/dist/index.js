"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const note_routes_1 = __importDefault(require("./routes/note.routes"));
const folder_routes_1 = __importDefault(require("./routes/folder.routes"));
const tag_routes_1 = __importDefault(require("./routes/tag.routes"));
const attachment_routes_1 = __importDefault(require("./routes/attachment.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Prisma Client
exports.prisma = new client_1.PrismaClient();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static file serving für Uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/notes', note_routes_1.default);
app.use('/api/folders', folder_routes_1.default);
app.use('/api/tags', tag_routes_1.default);
app.use('/api/attachments', attachment_routes_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});
// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await exports.prisma.$disconnect();
    process.exit(0);
});
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Dendrite Backend läuft auf http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map