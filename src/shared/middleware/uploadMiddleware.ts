import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const context = req.params.context || 'general_attachment';
        const uploadPath = path.join(__dirname, '../../../uploads', context);

        // Auto-create folder if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 }, // 500KB limit
    fileFilter: function (req, file, cb) {
        const allowed = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error('Only PDF, DOCX, JPG, PNG allowed'));
        }
        cb(null, true);
    },
});
