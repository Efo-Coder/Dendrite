"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Validierung
        if (!email || !password) {
            return res.status(400).json({ error: 'Email und Password sind erforderlich' });
        }
        // Prüfe ob User bereits existiert
        const existingUser = await index_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email bereits registriert' });
        }
        // Hash Password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Erstelle User
        const user = await index_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
        // Erstelle JWT Token
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
        res.status(201).json({
            message: 'User erfolgreich registriert',
            user,
            token,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Fehler bei der Registrierung' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validierung
        if (!email || !password) {
            return res.status(400).json({ error: 'Email und Password sind erforderlich' });
        }
        // Finde User
        const user = await index_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }
        // Prüfe Password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }
        // Erstelle JWT Token
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
        res.json({
            message: 'Login erfolgreich',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Fehler beim Login' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await index_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der User-Daten' });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map