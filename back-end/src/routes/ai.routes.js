import express from 'express';
import multer from 'multer';
import { analyzeImage, getHistory, getAnalysisById, deleteAnalysis } from '../controllers/ai.controller.js';
import { checkUser } from '../middlewares/checkUser.js';

const router = express.Router();

// Configure multer for handling file uploads (in-memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// POST  /api/ai/analyze        — upload and analyze an image (auth optional for analyze, required for history saving)
router.post('/analyze', upload.single('image'), tryAttachUser, analyzeImage);

// GET   /api/ai/history         — get user's analysis history (auth required)
router.get('/history', checkUser(), getHistory);

// GET   /api/ai/history/:id     — get a specific analysis (auth required)
router.get('/history/:id', checkUser(), getAnalysisById);

// DELETE /api/ai/history/:id    — delete a specific analysis (auth required)
router.delete('/history/:id', checkUser(), deleteAnalysis);

/**
 * Middleware that optionally attaches req.user if a valid token is present,
 * but does NOT reject unauthenticated requests (so guests can still analyze).
 */
async function tryAttachUser(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) return next();

    const token = authorization.split(' ')[1];
    if (!token) return next();

    try {
        const jwt = await import('jsonwebtoken');
        const Sessions = (await import('../models/sessions.model.js')).default;
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const session = await Sessions.findOne({ user: decoded._id, 'sessions.token': token });
        if (session) {
            req.user = { ...decoded };
        }
    } catch (_) {
        // Token invalid — proceed as guest, no history saved
    }
    next();
}

export default router;
