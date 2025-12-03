import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Ensure upload directories exist
const uploadDirs = ['uploads/avatars', 'uploads/faq-pdfs', 'uploads/course-thumbnails'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = (req as any).uploadType || 'general';
    let dir = 'uploads';
    
    switch (type) {
      case 'avatar':
        dir = 'uploads/avatars';
        break;
      case 'faq-pdf':
        dir = 'uploads/faq-pdfs';
        break;
      case 'course-thumbnail':
        dir = 'uploads/course-thumbnails';
        break;
    }
    
    cb(null, path.join(__dirname, '../../', dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const type = req.uploadType || 'general';
  
  if (type === 'avatar') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for avatars'));
    }
  } else if (type === 'faq-pdf') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed for FAQ documents'));
    }
  } else if (type === 'course-thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for thumbnails'));
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Upload avatar
router.post('/avatar', authenticate, (req: AuthRequest, res: Response, next) => {
  (req as any).uploadType = 'avatar';
  next();
}, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload FAQ PDF (admin only)
router.post('/faq-pdf', authenticate, isAdmin, (req: AuthRequest, res: Response, next) => {
  (req as any).uploadType = 'faq-pdf';
  next();
}, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/faq-pdfs/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload course thumbnail (admin only)
router.post('/course-thumbnail', authenticate, isAdmin, (req: AuthRequest, res: Response, next) => {
  (req as any).uploadType = 'course-thumbnail';
  next();
}, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/course-thumbnails/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete file (admin only)
router.delete('/:type/:filename', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type, filename } = req.params;
    
    let dir = 'uploads';
    switch (type) {
      case 'avatars':
        dir = 'uploads/avatars';
        break;
      case 'faq-pdfs':
        dir = 'uploads/faq-pdfs';
        break;
      case 'course-thumbnails':
        dir = 'uploads/course-thumbnails';
        break;
    }

    const filePath = path.join(__dirname, '../../', dir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
