// src/modules/student/controllers/admission.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Schema, Types } from 'mongoose';
import { AdmissionModel } from '../models/admission.model';
import { UploadedFileModel, UploadContext } from '../../upload/models/upload.model';



export const admissionController = {
    async getApplication(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const admission = await AdmissionModel.findOne({ user_id: userId })
                .lean();
            if (!admission) return res.status(200).json({ data: null });
            // Populate documents from UploadedFileModel
            const documents = await UploadedFileModel.find({
                context: UploadContext.STUDENT_DOCUMENT,
                owner_id: userId,
                'metadata.admission_id': admission._id,
                is_deleted: false
            }).lean();
            return res.status(200).json({ data: { ...admission, documents } });
        } catch (err) {
            next(err);
        }
    },

    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const admission = await AdmissionModel.findOne(
                { user_id: userId },
                'status'
            ).lean();
            const status = admission ? admission.status : 'none';
            return res.status(200).json({ status });
        } catch (err) {
            next(err);
        }
    },

    async apply(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            // Validate req.body before using
            const payload = req.body;
            const now = new Date();
            const update = {
                ...payload,
                user_id: userId,
                status: 'pending' as const,
                submitted_at: now
            };
            const admission = await AdmissionModel.findOneAndUpdate(
                { user_id: userId },
                { $set: update },
                { upsert: true, new: true }
            ).lean();
            return res.status(admission ? 200 : 201).json({ admission });
        } catch (err) {
            next(err);
        }
    },

    async addDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const { fileId, admission_id } = req.body;
            // Ensure admission exists
            const admission = await AdmissionModel.findOne({ user_id: userId });
            if (!admission) return res.status(400).json({ error: 'Apply first.' });
            const fileDoc = await UploadedFileModel.findByIdAndUpdate(
                fileId,
                {
                    $set: {
                        'metadata.admission_id': admission._id,
                        context: UploadContext.STUDENT_DOCUMENT,
                        owner_id: userId,
                        is_deleted: false
                    }
                },
                { new: true }
            ).lean();
            return res.status(201).json({ document: fileDoc });
        } catch (err) {
            next(err);
        }
    },

    async listDocuments(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const admission = await AdmissionModel.findOne({ user_id: userId }, '_id');
            if (!admission) return res.status(200).json({ documents: [] });
            const documents = await UploadedFileModel.find({
                context: UploadContext.STUDENT_DOCUMENT,
                owner_id: userId,
                'metadata.admission_id': admission._id,
                is_deleted: false
            }).lean();
            return res.status(200).json({ documents });
        } catch (err) {
            next(err);
        }
    },

    async deleteDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const { fileId } = req.params;
            const doc = await UploadedFileModel.findById(fileId);
            if (!doc) return res.status(404).json({ error: 'Not found.' });
            // Authorization
            if (!doc.owner_id.equals(userId)) {
                return res.status(403).json({ error: 'Forbidden.' });
            }
            await UploadedFileModel.updateOne(
                { _id: fileId },
                { $set: { is_deleted: true } }
            );
            return res.status(200).json({ success: true });
        } catch (err) {
            next(err);
        }
    }
};
