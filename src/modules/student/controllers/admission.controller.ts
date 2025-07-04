// src/modules/student/controllers/admission.controller.ts
import { Request, Response, NextFunction } from 'express';
import mongoose, { Schema, Types } from 'mongoose';
import { AdmissionModel } from '../models/admission.model';
import { UploadedFileModel, UploadContext } from '../../upload/models/upload.model';
import { CreateAdmissionDTO, CreateAdmissionSchema } from '../dtos/createAdmission.dto';
import { uploadService } from '../../upload/services/upload.service';
import { UpdateAdmissionDTO, UpdateAdmissionSchema } from '../dtos/updateAdmission.dto';
import { UpdateAdmissionStatusDTO, UpdateAdmissionStatusSchema } from '../dtos/updateAdmissionStatus.dto';



export class AdmissionController {
    async createAdmission(
        req: Request,
        res: Response,
        next: NextFunction
    ) {

        const dto = req.body as CreateAdmissionDTO;

        // 2. Authenticated user check
        const userId = req.user?.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // 3. Start transaction (in case you need to extend later)
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 4. Prevent duplicate admission for same user
            const existing = await AdmissionModel
                .findOne({ user_id: userId })
                .session(session);
            if (existing) {
                await session.abortTransaction();
                return res
                    .status(409)
                    .json({ success: false, message: 'Admission already exists for this user' });
            }

            // 5. Create the Admission record
            const [admission] = await AdmissionModel.create(
                [{
                    user_id: userId,
                    personal: dto.personal,
                    address: dto.address,
                    academic: dto.academic,
                    parent: dto.parent,
                }],
                { session }
            );

            // 6. Commit and end session
            await session.commitTransaction();
            session.endSession();

            // 7. Return the new admission
            const saved = await AdmissionModel.findById(admission._id).lean();
            return res.status(201).json({ success: true, admission: saved });
        } catch (err) {
            // Rollback on error
            await session.abortTransaction();
            session.endSession();
            next(err);
        }
    }

    async getApplication(req: Request, res: Response, next: NextFunction) {
        try {
            // 1. Auth check
            const userId = req.user?.user?._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // 2. Fetch admission for this user
            const admission = await AdmissionModel.findOne({ user_id: userId }).lean();
            if (!admission) {
                return res.status(404).json({ success: false, message: 'No admission found' });
            }

            // 3. Fetch linked documents (student_document context)
            const documents = await uploadService.listFiles(
                UploadContext.STUDENT_DOCUMENT,
                userId,
                // admission._id.toString()
            );

            // 4. Respond with both
            return res.json({
                success: true,
                admission,
                documents
            });
        } catch (err) {
            next(err);
        }
    }


    async getAllApplication(req: Request, res: Response, next: NextFunction) {
        try {
            // 1. Auth check
            const userId = req.user?.user?._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // 2. Fetch admission for this user
            const admission = await AdmissionModel.find().lean();
            if (!admission) {
                return res.status(404).json({ success: false, message: 'No admission found' });
            }

            // 3. Fetch linked documents (student_document context)
            const documents = await uploadService.listFiles(
                UploadContext.STUDENT_DOCUMENT,
                userId,
                // admission._id.toString()
            );

            // 4. Respond with both
            return res.json({
                success: true,
                admission,
                documents
            });
        } catch (err) {
            next(err);
        }
    }

    async updateAdmission(req: Request, res: Response, next: NextFunction) {
        const dto = req.body as UpdateAdmissionDTO;
        const userId = req.user?.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Build a $set object that only contains the fields the client sent
        const set: Record<string, any> = {};

        if (dto.personal) {
            Object.entries(dto.personal).forEach(([k, v]) => {
                if (v !== undefined) set[`personal.${k}`] = v;
            });
        }
        if (dto.address) {
            Object.entries(dto.address).forEach(([k, v]) => {
                if (v !== undefined) set[`address.${k}`] = v;
            });
        }
        if (dto.academic) {
            Object.entries(dto.academic).forEach(([k, v]) => {
                if (v !== undefined) set[`academic.${k}`] = v;
            });
        }
        if (dto.parent) {
            Object.entries(dto.parent).forEach(([k, v]) => {
                if (k !== 'address' && v !== undefined) {
                    set[`parent.${k}`] = v;
                }
            });
            if (dto.parent.address) {
                Object.entries(dto.parent.address).forEach(([k, v]) => {
                    if (v !== undefined) set[`parent.address.${k}`] = v;
                });
            }
        }

        try {
            const updated = await AdmissionModel.findOneAndUpdate(
                { user_id: userId },
                { $set: set },
                { new: true, runValidators: true, context: 'query' }
            ).lean();

            if (!updated) {
                return res.status(404).json({ success: false, message: 'Admission not found' });
            }
            return res.json({ success: true, admission: updated });
        } catch (err) {
            next(err);
        }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction) {
        // 1. Validate body
        const parse = UpdateAdmissionStatusSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ success: false, errors: parse.error.format() });
        }
        const { status } = parse.data as UpdateAdmissionStatusDTO;

        // 2. Auth & role check
        const user = req.user?.user;


        // 3. Admission ID param
        const admissionId = req.params.admissionId;
        try {
            // 4. Update
            const updated = await AdmissionModel.findByIdAndUpdate(
                admissionId,
                { $set: { status, reviewed_at: new Date() } },
                { new: true, runValidators: true }
            ).lean();

            if (!updated) {
                return res.status(404).json({ success: false, message: 'Admission not found' });
            }
            return res.json({ success: true, admission: updated });
        } catch (err) {
            next(err);
        }
    }
}

export const admissionController = new AdmissionController();