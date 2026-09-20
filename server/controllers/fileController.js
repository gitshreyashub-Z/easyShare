import File from '../models/File.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getSupabase, getSupabaseBucket } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadFile = async (req, res) => {
  let storagePath;

  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const shortId = uuidv4().slice(0, 8);
    storagePath = `${shortId}/${req.file.filename}`;
    const fileContents = fs.readFileSync(req.file.path);
    const { error: uploadError } = await getSupabase()
      .storage
      .from(getSupabaseBucket())
      .upload(storagePath, fileContents, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const file = await File.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: storagePath,
      storagePath,
      shortId,
      user: req.user ? req.user._id : null,
    });

    res.status(201).json({
      ...file._doc,
      shareUrl: `${process.env.CLIENT_URL}/file/${shortId}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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

    if (file.storagePath) {
      const { data, error } = await getSupabase()
        .storage
        .from(getSupabaseBucket())
        .createSignedUrl(file.storagePath, 60, { download: file.originalName });

      if (error) throw error;
      return res.redirect(data.signedUrl);
    }

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

    if (file.storagePath) {
      const { error } = await getSupabase()
        .storage
        .from(getSupabaseBucket())
        .remove([file.storagePath]);

      if (error) throw error;
    } else if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    await file.deleteOne();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const previewFile = async (req, res) => {
  try {
    const file = await File.findOne({ shortId: req.params.shortId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    if (file.storagePath) {
      const { data, error } = await getSupabase()
        .storage
        .from(getSupabaseBucket())
        .createSignedUrl(file.storagePath, 60);

      if (error) throw error;
      return res.redirect(data.signedUrl);
    }

    return res.sendFile(path.resolve(file.path));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
