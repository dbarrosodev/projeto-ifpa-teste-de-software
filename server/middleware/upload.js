const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Temporary storage before processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  
  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo não suportado. Envie imagens (JPEG, PNG, WebP, GIF) ou vídeos (MP4, WebM).'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  },
  fileFilter
});

// Process image with Sharp for optimal performance (RNF001)
async function processMedia(file) {
  if (!file) return null;

  const isImage = file.mimetype.startsWith('image/');
  const fileId = uuidv4();

  if (isImage) {
    // Generate optimized WebP
    const filename = `${fileId}.webp`;
    const filepath = path.join(uploadDir, filename);

    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    // Get dominant color
    const stats = await image.stats();
    const dominantColor = stats.dominant 
      ? `rgb(${stats.dominant.r}, ${stats.dominant.g}, ${stats.dominant.b})` 
      : '#e60023';

    await image
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    return {
      url: `/uploads/${filename}`,
      tipoMidia: 'imagem',
      corDominante: dominantColor,
      largura: metadata.width,
      altura: metadata.height
    };
  } else {
    // Save video directly
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `${fileId}${ext}`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    return {
      url: `/uploads/${filename}`,
      tipoMidia: 'video',
      corDominante: '#111111'
    };
  }
}

module.exports = {
  upload,
  processMedia
};
