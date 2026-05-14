import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { AppError } from '../utils/errors.js';

const memoryStorage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/mp4',
    'video/mp4', 'video/webm'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const cloudinaryMulter = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

/**
 * Upload a multer-processed file buffer to Cloudinary.
 * Returns the secure URL. Attaches `cloudinaryUrl` to `req`.
 */
export function uploadToCloudinary(folder = 'connect_alumni') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file?.buffer) return next();
    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            transformation: req.file!.mimetype.startsWith('image/')
              ? [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
              : undefined
          },
          (err, result) => {
            if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
            resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });
      // Attach the Cloudinary URL so route handlers can use it
      (req as any).cloudinaryUrl = result.secure_url;
      next();
    } catch (err) {
      next(new AppError(500, 'Cloud upload failed', 'UPLOAD_FAILED'));
    }
  };
}

export { cloudinaryMulter };
