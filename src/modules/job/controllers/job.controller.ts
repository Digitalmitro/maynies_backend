import { Request, Response, NextFunction } from 'express';
import { jobService, JobService } from '../services/job.service';
import { log } from 'winston';
import { JobModel } from '../models/job.model';
import { Types } from 'mongoose';

export class JobController {


    async getAllJobs(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await jobService.getAllJobs(req.query);
            return res.json({
                message: 'Jobs fetched successfully',
                data
            });
        } catch (err) {
            next(err);
        }
    }

    async getJobById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid job ID' });
            }

            const job = await JobModel.findOne({
                _id: id,
                is_active: true,
                expires_at: { $gte: new Date() }
            }).exec();

            if (!job) {
                return res.status(404).json({ message: 'Job not found or expired' });
            }

            return res.json({
                message: 'Single job fetched successfully',
                data: job
            });
        } catch (err) {
            next(err);
        }
    }

    async getJobBySlug(req: Request, res: Response, next: NextFunction) {

        try {
            const { slug } = req.params;

            console.log("slug", slug);

            const job = await JobModel.findOne({
                slug,
                is_active: true,
                expires_at: { $gte: new Date() }
            });

            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }

            return res.json({
                message: 'Job fetched by slug successfully',
                data: job
            });

        } catch (err) {
            next(err);
        }
    }


    async createJob(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user
            console.log(user?.roles[0]?.name);

            if (!user || !user.user._id || !user.roles[0]?.name) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const data = await jobService.createJob(req.body, { _id: user?.user._id, role: user?.roles[0]?.name });

            return res.status(201).json({
                message: 'Job created successfully',
                data,
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || 'Job creation failed',
            });
        }
    }

    async updateJob(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const currentUser = req.user?.user;
            const userRoles = req.user?.roles || [];

            const updatedJob = await jobService.updateJobById(id, updates, {
                _id: currentUser._id,
                roles: userRoles
            });

            return res.json({
                message: 'Job updated successfully',
                data: updatedJob
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || 'Job update failed'
            });
        }
    }

    async deleteJob(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const currentUser = req.user?.user;
            const userRoles = req.user?.roles || [];

            const job = await jobService.deleteJobById(id, {
                _id: currentUser._id,
                roles: userRoles
            });

            return res.json({
                message: 'Job deleted (soft) successfully',
                data: job
            });
        } catch (err: any) {
            return res.status(400).json({ message: err.message || 'Delete failed' });
        }
    }


    async applyToJob(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.user._id; // assuming JWT middleware sets req.user
            const userRole = req.user?.roles[0]?.name; // assuming JWT middleware sets req.user
            const job_id = req.params.id;
            const { resume_url, cover_letter } = req.body;

            if (!job_id || !resume_url) {
                return res.status(400).json({ message: 'job_id and resume_url are required.' });
            }

            const application = await jobService.applyToJobService(userId, userRole, job_id, resume_url, cover_letter);

            res.status(201).json({
                message: 'Job application submitted successfully',
                application
            });

        } catch (err) {
            next(err);
        }
    }

    async getJobApplications(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const userRole = req?.user?.roles[0]?.name;
            const jobId = req.params.id;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await jobService.getJobApplicationsService(
                userId,
                userRole,
                jobId,
                page,
                limit
            );
            // console.log(`result`, result);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }



    async getApplicationHistory(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = req?.user?.user?._id;
            const userRole = req.user?.roles[0]?.name;
            const applicationId = req.params.id;

            const history = await jobService.getApplicationHistoryService(userId, userRole, applicationId);
            res.json({ history });
        } catch (err) {
            next(err);
        }
    }

    async getMyApplications(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = req?.user?.user?._id;
            const userRole = req?.user?.roles[0]?.name;
            console.log(`result`, userRole);
            if (userRole !== 'student') {
                return res.status(403).json({ message: 'Only students can view their applications.' });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await jobService.getMyApplicationsService(userId, page, limit);

            res.json(result);
        } catch (err) {
            next(err);
        }
    };

    async updateApplicationStatus(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = req?.user?.user?._id;
            const userRole = req?.user?.roles?.[0]?.name || 'student';
            const applicationId = req.params.id;
            const { to_status, note, reason_code } = req.body;

            const result = await jobService.updateApplicationStatusService(
                userId,
                userRole,
                applicationId,
                to_status,
                note,
                reason_code
            );

            res.status(200).json({
                message: 'Application status updated successfully',
                application: result
            });
        } catch (err) {
            next(err);
        }
    }
}
// 👇 Instantiate and export
export const jobController = new JobController();
