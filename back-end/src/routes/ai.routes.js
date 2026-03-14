import express from 'express';
import multer from 'multer';
import { analyzeImage } from '../controllers/ai.controller.js';

const router = express.Router();

// Configure multer for handling file uploads (in-memory storage for now)
const upload = multer({ storage: multer.memoryStorage() });

// POST route that expects an 'image' file field
router.post('/analyze', upload.single('image'), analyzeImage);

export default router;
