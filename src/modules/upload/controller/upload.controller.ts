import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { UploadContext } from '../models/upload.model';

export class UploadController {
    async handleUpload(req: Request, res: Response, next: NextFunction) {
        try {
            const file = req.file;
            const contextParam = req.params.context as UploadContext;
            const user = req.user?.user;

            if (!file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Validate context exists in enum
            if (!Object.values(UploadContext).includes(contextParam)) {
                return res.status(400).json({ message: `Invalid context "${contextParam}"` });
            }

            // Extract optional metadata from body
            const { admission_id, name, tags, expires_at } = req.body;

            // Call service with file, user, context, and metadata options
            const result = await uploadService.saveUploadedFile(
                file,
                user,
                contextParam,
                {
                    admission_id,
                    name,
                    // ensure tags is an array if provided
                    tags: Array.isArray(tags) ? tags : undefined,
                    expires_at,
                }
            );

            return res.status(200).json({
                message: 'Upload successful',
                ...result,
            });
        } catch (err) {
            next(err);
        }
    }

    async listFiles(req: Request, res: Response, next: NextFunction) {
        try {
            const contextParam = req.params.context as UploadContext;
            const user = req.user?.user;
            if (!user) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // Optional admission_id filter
            const admissionId = req.query.admission_id as string | undefined;

            // Fetch from service
            const files = await uploadService.listFiles(
                contextParam,
                user._id,
                admissionId
            );

            return res.json({ success: true, files });
        } catch (err: any) {
            // service throws on invalid context/admission_id
            return res.status(400).json({ success: false, message: err.message });
        }
    }


}

export const uploadController = new UploadController();
