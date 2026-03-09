import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');

// Ensure upload directories exist
const uploadDirs = ['employees', 'services', 'inventory', 'imports', 'videos', 'carousel', 'taxonomy', 'resources'];
for (const dir of uploadDirs) {
  const p = join(serverDir, 'uploads', dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, join(serverDir, 'uploads', req.uploadDir || 'employees'));
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.csv'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

export const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.ogg'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

export { serverDir };
