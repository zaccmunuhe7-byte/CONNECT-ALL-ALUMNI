import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { AppError } from '../../utils/errors.js';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

// General file upload endpoint
uploadRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('audio/') ? 'audio'
      : req.file.mimetype.startsWith('image/') ? 'image'
      : req.file.mimetype.startsWith('video/') ? 'video' : 'file';
    res.json({ url, fileType, originalName: req.file.originalname });
  } catch (error) {
    next(error);
  }
});
