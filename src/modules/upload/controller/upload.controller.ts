import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';

class UploadController {
    async handleUpload(req: Request, res: Response, next: NextFunction) {
        try {
            const file = req.file;
            const context = req.params.context;
            const user = req.user?.user;

            if (!file) {
                res.status(400).json({ message: 'No file uploaded' });
                return
            }

            const result = await uploadService.saveUploadedFile(file, user, context);

            res.status(200).json({
                message: 'Upload successful',
                ...result
            });

        } catch (err) {
            next(err);
        }
    }
}

export const uploadController = new UploadController();
