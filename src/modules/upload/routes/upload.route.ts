import { Router } from 'express';
import { upload } from '../../../shared/middleware/uploadMiddleware';
import { uploadController } from '../controller/upload.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

router.post(
    '/:context',
    authenticate,
    upload.single('file'),
    (req, res, next) => { uploadController.handleUpload(req, res, next) }
);


router.get(
    '/:context',
    authenticate,
    (req, res, next) => { uploadController.listFiles(req, res, next) }
);


export default router;
