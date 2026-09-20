import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  uploadFile, getFileByShortId, downloadFile, previewFile,
  getUserFiles, deleteFile
} from '../controllers/fileController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = express.Router();
router.post('/upload', optionalAuth, upload.single('file'), uploadFile);
router.get('/my-files', protect, getUserFiles);
router.get('/:shortId/preview', previewFile);
router.get('/:shortId/download', downloadFile);
router.get('/:shortId', getFileByShortId);
router.delete('/:shortId', protect, deleteFile);

export default router;
