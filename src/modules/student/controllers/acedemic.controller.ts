import { Request, Response, NextFunction } from 'express';
import { AcademicYearModel } from '../models/academicYear.model';
import { UploadedFileModel } from '../../upload/models/upload.model';
import { AcademicEventModel } from '../models/academicEvent.model';

class AcademicController {

    async getAllAcademicYears(req: Request, res: Response, next: NextFunction) {
        try {
            const years = await AcademicYearModel.find()
                .populate('pdfFileId', 'file_url original_name size') // Populate only needed fields
                .sort({ createdAt: -1 }) // Latest first
                .lean();

            return res.status(200).json({
                success: true,
                message: 'Academic years fetched successfully.',
                data: years
            });
        } catch (error: unknown) {
            console.error('Error fetching academic years:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch academic years.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async createAcademicYear(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, pdfFileId } = req.body;
            const createdBy = req.user?.user?._id; // From auth middleware

            // Validate inputs
            if (!name || !pdfFileId) {
                return res.status(400).json({
                    success: false,
                    message: 'Both "name" and "pdfFileId" are required.'
                });
            }

            // Check for duplicate year
            const existingYear = await AcademicYearModel.findOne({ name });
            if (existingYear) {
                return res.status(409).json({
                    success: false,
                    message: `Academic year "${name}" already exists.`
                });
            }

            // Validate uploaded file exists
            const uploadedFile = await UploadedFileModel.findById(pdfFileId);
            if (!uploadedFile) {
                return res.status(404).json({
                    success: false,
                    message: 'Uploaded PDF file not found.'
                });
            }

            // Create new academic year
            const academicYear = await AcademicYearModel.create({
                name,
                pdfFileId,
                createdBy
            });

            // Populate PDF details for response
            await academicYear.populate('pdfFileId', 'file_url original_name size');

            return res.status(201).json({
                success: true,
                message: 'Academic year created successfully.',
                data: academicYear
            });
        } catch (error) {
            console.error('Error creating academic year:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create academic year.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getAcademicYearByName(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName } = req.params;

            // Fetch the academic year by name and populate pdf details
            const year = await AcademicYearModel.findOne({ name: yearName })
                .populate('pdfFileId', 'file_url original_name size')
                .lean();

            if (!year) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`,
                });
            }

            return res.status(200).json({
                success: true,
                message: `Academic year "${yearName}" fetched successfully.`,
                data: year
            });
        } catch (error: unknown) {
            console.error(`Error fetching academic year "${req.params.yearName}":`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch academic year.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    async createEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName } = req.params;
            const {
                title,
                description,
                startDate,
                endDate,
                allDay = true,
                category
            } = req.body;

            const user = req.user?.user; // Assuming req.user is set after auth middleware

            // 📌 Validate AcademicYear exists
            const academicYear = await AcademicYearModel.findOne({ name: yearName });
            if (!academicYear) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`
                });
            }

            // ✅ Create event
            const newEvent = await AcademicEventModel.create({
                academicYear: academicYear._id,
                title,
                description,
                startDate,
                endDate,
                allDay,
                category,
                createdBy: user._id
            });

            return res.status(201).json({
                success: true,
                message: 'Academic event created successfully.',
                data: newEvent
            });
        } catch (error: unknown) {
            console.error('Error creating academic event:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create academic event.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // 📥 Get all events for a specific academic year
    async getEventsByYear(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName } = req.params;
            const { category, from, to } = req.query;

            // 📌 Validate AcademicYear exists
            const academicYear = await AcademicYearModel.findOne({ name: yearName });
            if (!academicYear) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`
                });
            }

            // 🔥 Build dynamic query
            const query: any = { academicYear: academicYear._id };

            if (category) {
                query.category = category;
            }

            if (from || to) {
                query.startDate = {};
                if (from) query.startDate.$gte = new Date(from as string);
                if (to) query.startDate.$lte = new Date(to as string);
            }

            // 🔄 Fetch events
            const events = await AcademicEventModel.find(query)
                .populate('createdBy', 'name email') // Optional: include admin details
                .sort({ startDate: 1 }) // Earliest first
                .lean();

            return res.status(200).json({
                success: true,
                message: `Events for academic year "${yearName}" fetched successfully.`,
                data: events
            });
        } catch (error: unknown) {
            console.error('Error fetching academic events:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch academic events.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    async getEventById(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName, eventId } = req.params;

            // 📌 Validate academic year exists
            const academicYear = await AcademicYearModel.findOne({ name: yearName });
            if (!academicYear) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`
                });
            }

            // 🔎 Find event
            const event = await AcademicEventModel.findOne({
                _id: eventId,
                academicYear: academicYear._id
            })
                .populate('createdBy', 'name email')
                .lean();

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: `Event with ID "${eventId}" not found in year "${yearName}".`
                });
            }

            return res.status(200).json({
                success: true,
                message: `Event fetched successfully.`,
                data: event
            });
        } catch (error: unknown) {
            console.error('Error fetching academic event by ID:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch academic event.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // ✏️ Update a specific academic event
    async updateEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName, eventId } = req.params;
            const user = req.user?.user;

            // 📌 Validate academic year exists
            const academicYear = await AcademicYearModel.findOne({ name: yearName });
            if (!academicYear) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`
                });
            }

            // 🔥 Fetch the event
            const event = await AcademicEventModel.findOne({
                _id: eventId,
                academicYear: academicYear._id
            });

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: `Event with ID "${eventId}" not found in year "${yearName}".`
                });
            }

            // 🛡 Optional: Check permission (only creator/admin can edit)
            if (String(event.createdBy) !== String(user._id) && user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to update this event.'
                });
            }

            // ✅ Update fields
            const updatableFields = ['title', 'description', 'startDate', 'endDate', 'allDay', 'category'];
            updatableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    (event as any)[field] = req.body[field];
                }
            });

            await event.save();

            return res.status(200).json({
                success: true,
                message: 'Academic event updated successfully.',
                data: event
            });
        } catch (error: unknown) {
            console.error('Error updating academic event:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update academic event.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async deleteEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { yearName, eventId } = req.params;
            const user = req.user?.user;

            // 📌 Validate academic year exists
            const academicYear = await AcademicYearModel.findOne({ name: yearName });
            if (!academicYear) {
                return res.status(404).json({
                    success: false,
                    message: `Academic year "${yearName}" not found.`
                });
            }

            // 🔎 Find event
            const event = await AcademicEventModel.findOne({
                _id: eventId,
                academicYear: academicYear._id
            });

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: `Event with ID "${eventId}" not found in year "${yearName}".`
                });
            }

            // 🛡 Permission check
            if (String(event.createdBy) !== String(user._id) && user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this event.'
                });
            }

            await event.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Academic event deleted successfully.'
            });
        } catch (error: unknown) {
            console.error('Error deleting academic event:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete academic event.',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


}

export const academicController = new AcademicController();
