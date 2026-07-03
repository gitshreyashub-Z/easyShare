import File from '../models/File.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const shortId = uuidv4().slice(0, 8);
    const file = await File.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      shortId,
      user: req.user ? req.user._id : null,
    });

    res.status(201).json({
      ...file._doc,
      shareUrl: `${process.env.CLIENT_URL}/file/${shortId}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFileByShortId = async (req, res) => {
  try {
    const file = await File.findOne({ shortId: req.params.shortId });
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json({ ...file._doc, shareUrl: `${process.env.CLIENT_URL}/file/${file.shortId}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({ shortId: req.params.shortId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.downloadCount += 1;
    await file.save();

    res.download(file.path, file.originalName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserFiles = async (req, res) => {
  try {
    const files = await File.find({ user: req.user._id }).sort({ createdAt: -1 });
    const filesWithUrl = files.map(f => ({
      ...f._doc,
      shareUrl: `${process.env.CLIENT_URL}/file/${f.shortId}`,
    }));
    res.json(filesWithUrl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ shortId: req.params.shortId, user: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Delete physical file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await file.deleteOne();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};