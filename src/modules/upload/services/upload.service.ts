import { Request } from 'express';
import { UploadedFileModel, UploadContext } from '../models/upload.model';

class UploadService {
    async saveUploadedFile(file: Express.Multer.File, user: any, context: string) {
        if (!file) throw new Error('No file uploaded');

        if (!Object.values(UploadContext).includes(context as UploadContext)) {
            throw new Error('Invalid upload context');
        }

        const file_url = `/api/uploads/${context}/${file.filename}`;

        const fileDoc = await UploadedFileModel.create({
            file_url,
            type: file.mimetype,
            size: file.size,
            original_name: file.originalname,
            context,
            owner_id: user._id,
            uploaded_by_role: user.roles?.[0]?.name || null,
            metadata: {
                name: file.originalname
            }
        });

        return {
            file_id: fileDoc._id,
            file_url: fileDoc.file_url,
            context: fileDoc.context
        };
    }
}

export const uploadService = new UploadService();
