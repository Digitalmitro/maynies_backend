import { Request } from 'express';
import { UploadedFileModel, UploadContext } from '../models/upload.model';
import { Schema, Types } from 'mongoose';
import { AdmissionModel } from '../../student/models/admission.model';

interface SaveUploadedFileOptions {
    admission_id?: string;
    name?: string;
    tags?: string[];
    expires_at?: Date | string;
}

class UploadService {
    /**
     * Save an uploaded file with optional metadata.
     * @param file      - Multer file object (must be present)
     * @param user      - Authenticated user object (must have _id & roles)
     * @param context   - One of UploadContext enum values
     * @param options   - Optional metadata: admission_id, name, tags, expires_at
     */
    async saveUploadedFile(
        file: Express.Multer.File,
        user: { _id: string; roles?: { name: string }[] },
        context: string,
        options: SaveUploadedFileOptions = {}
    ) {
        // 1. Basic validations
        if (!file) {
            throw new Error('No file provided');
        }
        if (!Object.values(UploadContext).includes(context as UploadContext)) {
            throw new Error(`Invalid context "${context}"`);
        }

        // 2. Prepare metadata object
        const metadata: Record<string, any> = {};

        // 2a. Custom name override
        if (options.name) {
            metadata.name = options.name;
        } else {
            // default to original filename
            metadata.name = file.originalname;
        }

        // 2b. Tags
        if (options.tags) {
            if (!Array.isArray(options.tags)) {
                throw new Error('metadata.tags must be an array of strings');
            }
            metadata.tags = options.tags;
        }

        // 2c. Expiry date
        if (options.expires_at) {
            const exp = typeof options.expires_at === 'string'
                ? new Date(options.expires_at)
                : options.expires_at;
            if (isNaN(exp.getTime())) {
                throw new Error('metadata.expires_at must be a valid date');
            }
            metadata.expires_at = exp;
        }

        // 2d. Admission link (if provided)
        if (options.admission_id) {
            if (!Types.ObjectId.isValid(options.admission_id)) {
                throw new Error('metadata.admission_id is not a valid ObjectId');
            }
            // verify admission exists
            const admission = await AdmissionModel.findById(options.admission_id).lean();
            if (!admission) {
                throw new Error(`No admission found for ID ${options.admission_id}`);
            }
            metadata.admission_id = new Types.ObjectId(options.admission_id);
        }

        // 3. Build file_url (could be customized to include CDNs, versioning, etc.)
        const file_url = `/api/uploads/${context}/${file.filename}`;

        // 4. Save to DB
        const fileDoc = await UploadedFileModel.create({
            file_url,
            type: file.mimetype,
            size: file.size,
            original_name: file.originalname,
            context,
            owner_id: user._id,
            uploaded_by_role: user.roles?.[0]?.name || null,
            is_deleted: false,
            metadata,
        });

        // 5. Return minimal response
        return {
            file_id: fileDoc._id.toString(),
            file_url: fileDoc.file_url,
            user_id: fileDoc.owner_id,
            context: fileDoc.context,
            metadata: fileDoc.metadata,
        };
    }

    async listFiles(
        context: UploadContext,
        ownerId: string,
        admissionId?: string
    ) {
        // 1. Validate context
        if (!Object.values(UploadContext).includes(context)) {
            throw new Error(`Invalid context "${context}"`);
        }

        // 2. Build filter
        const filter: any = {
            context,
            owner_id: ownerId,
            is_deleted: false,
        };
        if (admissionId) {
            if (!Types.ObjectId.isValid(admissionId)) {
                throw new Error('Invalid admission_id');
            }
            filter['metadata.admission_id'] = new Types.ObjectId(admissionId);
        }

        // 3. Query DB
        const files = await UploadedFileModel.find(filter)
            .select({
                _id: 1,
                file_url: 1,
                original_name: 1,
                uploaded_at: 1,
                'metadata.name': 1,
                'metadata.tags': 1,
                'metadata.admission_id': 1,
            })
            .sort({ uploaded_at: -1 })
            .lean();

        return files.map(f => ({
            file_id: f._id.toString(),
            file_url: f.file_url,
            original_name: f.original_name,
            uploaded_at: f.uploaded_at,
            name: f.metadata?.name ?? f.original_name,
            tags: f.metadata?.tags ?? [],
            admission_id: f.metadata?.admission_id?.toString() ?? null,
        }));
    }
}

export const uploadService = new UploadService();
