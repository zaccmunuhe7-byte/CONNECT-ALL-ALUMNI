import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { isCloudinaryConfigured } from '../../config/cloudinary.js';
import { cloudinaryMulter, uploadToCloudinary } from '../../middleware/cloudinary-upload.js';
import { AppError } from '../../utils/errors.js';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

// General file upload endpoint — uses Cloudinary when configured, local disk otherwise
if (isCloudinaryConfigured()) {
  uploadRouter.post('/', cloudinaryMulter.single('file'), uploadToCloudinary('uploads'), async (req, res, next) => {
    try {
      if (!(req as any).cloudinaryUrl) throw new AppError(400, 'No file uploaded', 'NO_FILE');
      const url = (req as any).cloudinaryUrl;
      const fileType = req.file!.mimetype.startsWith('audio/') ? 'audio'
        : req.file!.mimetype.startsWith('image/') ? 'image'
        : req.file!.mimetype.startsWith('video/') ? 'video' : 'file';
      res.json({ url, fileType, originalName: req.file!.originalname });
    } catch (error) {
      next(error);
    }
  });
} else {
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
}
