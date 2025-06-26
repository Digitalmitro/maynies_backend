// job.service.ts

import { Types } from 'mongoose';
import { IJobDoc, JobModel } from '../models/job.model';
import { JobApplicationModel, jobStatusEnum } from '../models/jobApplication.model';
import { JobStatusHistoryModel } from '../models/JobStatusHistory.model';
import { jobStatusEnumType } from '../types';


interface GetJobsQuery {
    search?: string;
    location?: string;
    job_type?: 'full-time' | 'part-time' | 'internship';
    page?: number;
    limit?: number;
    category?: string;
    experience?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}


export class JobService {

    async getAllJobs(query: GetJobsQuery) {
        const {
            search = '',
            location,
            job_type,
            category,
            experience, // 👈 expected as number (e.g., ?experience=2)
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = query;

        const filter: any = { is_active: true, expires_at: { $gte: new Date() } };

        if (location) filter.location = location;
        if (job_type) filter.job_type = job_type;
        if (category) filter.category = category;
        if (experience) filter.experience_years = { $gte: Number(experience) };

        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { short_description: new RegExp(search, 'i') }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);

        const [jobs, total] = await Promise.all([
            JobModel.find(filter)
                .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                .skip(skip)
                .limit(Number(limit))
                .exec(),
            JobModel.countDocuments(filter)
        ]);

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            jobs
        };
    }

    async createJob(payload: any, user: { _id: Types.ObjectId; role: string }) {
        const {
            title,
            slug,
            short_description,
            description,
            location,
            job_type,
            experience,
            expires_at,
            requirements,
            openings,
            application_instructions,
            attachment_url,
            salary_range,
        } = payload;

        // 🚫 1. Role check
        if (user.role !== 'admin') {
            throw new Error('Only admin is authorized to post jobs');
        }

        // 🚫 2. Required field check
        // if (!title || !description || !location || !job_type || !expires_at) {
        //     throw new Error('Missing required fields');
        // }

        // 🚫 3. Expiry date check
        const expiryDate = new Date(expires_at);
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
            throw new Error('Expiry date must be a valid future date');
        }

        // 🚫 4. Salary validation
        if (salary_range && salary_range.min > salary_range.max) {
            throw new Error('Minimum salary cannot be greater than maximum salary');
        }

        // 🚫 5. Duplicate job post (same title+location+user)
        const existing = await JobModel.findOne({
            title,
            location,
            posted_by: user._id,
            is_active: true,
        });
        if (existing) {
            throw new Error('Duplicate job post already exists');
        }

        // 🚫 6. Rate limit check (optional, comment out if not needed)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const postCount = await JobModel.countDocuments({
            posted_by: user._id,
            created_at: { $gte: fiveMinsAgo },
        });
        if (postCount >= 5) {
            throw new Error('Too many job posts in short time, please slow down');
        }

        // ✅ 7. Create job
        const job = new JobModel({
            title,
            slug,
            short_description,
            description,
            location,
            job_type,
            experience,
            expires_at: expiryDate,
            posted_by: user._id,
            requirements,
            openings,
            application_instructions,
            attachment_url,
            salary_range,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });

        await job.save();

        return {
            id: job._id,
            title: job.title,
            slug: job.slug,
            job_type: job.job_type,
            posted_by: user._id,
            expires_at: job.expires_at,
        };
    }

    async updateJobById(
        jobId: string,
        updates: Partial<any>,
        currentUser: {
            _id: Types.ObjectId;
            roles: { name: string }[];
        }
    ) {
        // 1. Validate ID
        if (!Types.ObjectId.isValid(jobId)) {
            throw new Error('Invalid job ID');
        }

        // 2. Fetch job
        const job = await JobModel.findById(jobId);
        if (!job) throw new Error('Job not found');

        // 3. Check Permission
        const isAdmin = currentUser.roles.some(role => role.name === 'admin');
        const isOwner = job.posted_by.toString() === currentUser._id.toString();
        if (!isAdmin && !isOwner) {
            throw new Error('Not authorized to update this job');
        }

        // 4. Optional: Restrict fields
        const allowed = [
            'title', 'short_description', 'description', 'location', 'job_type',
            'experience', 'expires_at', 'requirements', 'openings',
            'application_instructions', 'attachment_url', 'salary_range', 'is_active'
        ];
        for (const key in updates) {
            if (!allowed.includes(key)) delete updates[key];
        }

        // 5. Apply updates
        Object.assign(job, updates);
        job.updated_at = new Date();

        await job.save();
        return job;
    }

    async deleteJobById(
        jobId: string,
        currentUser: {
            _id: Types.ObjectId;
            roles: { name: string }[];
        }
    ) {
        if (!Types.ObjectId.isValid(jobId)) {
            throw new Error('Invalid job ID');
        }

        const job = await JobModel.findById(jobId);
        if (!job) throw new Error('Job not found');

        const isAdmin = currentUser.roles.some(role => role.name === 'admin');
        const isOwner = job.posted_by.toString() === currentUser._id.toString();

        if (!isAdmin && !isOwner) {
            throw new Error('Not authorized to delete this job');
        }

        // Soft delete: mark inactive
        job.is_active = false;
        job.updated_at = new Date();

        await job.save();
        return job;
    }


    async applyToJobService(
        userId: Types.ObjectId,
        userRole: string,
        jobId: string,
        resume_url: string,
        cover_letter?: string
    ) {
        // ✅ Rule 1: Only students can apply
        if (userRole !== 'student') {
            throw new Error('Only students can apply for jobs.');
        }

        // ✅ Rule 2: Check if job exists and is open
        const job = await JobModel.findById(jobId);
        if (!job || job.is_active === false || job.expires_at < new Date()) {
            throw new Error('This job is no longer available.');
        }

        // ✅ Rule 3: Prevent duplicate apply
        const existing = await JobApplicationModel.findOne({ user_id: userId, job_id: jobId });
        if (existing) throw new Error('You have already applied to this job.');

        // ✅ Create application
        const application = await JobApplicationModel.create({
            user_id: userId,
            job_id: jobId,
            resume_url,
            cover_letter
        });

        // ✅ Log initial status
        await JobStatusHistoryModel.create({
            application_id: application._id,
            changed_by: userId,
            from_status: 'none',
            to_status: 'applied',
            note: 'Initial job application submitted'
        });

        return application;
    };

    async getJobApplicationsService(
        userId: Types.ObjectId,
        userRole: string,
        jobId: string,
        page = 1,
        limit = 10
    ) {
        try {
            // ✅ Step 1: Job Exists?
            const job = await JobModel.findById(jobId);
            if (!job) {
                throw new Error(`[Step 1] Job not found for ID: ${jobId}`);
            }
            console.log(userRole)
            // ✅ Step 2: Permission check
            const isAdmin = userRole === 'admin';
            const isOwner = job.posted_by.toString() === userId.toString();

            const job_id = new Types.ObjectId(jobId);

            if (!isAdmin && !isOwner) {
                throw new Error(`[Step 2] Unauthorized: user ${userId} tried to access job ${jobId}`);
            }

            // ✅ Step 3: Fetch Applications
            const skip = (page - 1) * limit;

            const [applications, total] = await Promise.all([
                JobApplicationModel.find({ job_id })
                    .populate('user_id', 'name email')
                    .sort({ applied_at: -1 })
                    .skip(skip)
                    .limit(limit),
                JobApplicationModel.countDocuments({ job_id })
            ]);
            console.log(`application`, applications);

            return {
                data: applications,
                total,
                page,
                pages: Math.ceil(total / limit)
            };
        } catch (error: any) {
            console.error('❌ getJobApplicationsService error:', error);
            throw new Error(`[JobApplicationService] ${error?.message}`);
        }
    }

    async getMyApplicationsService(
        userId: Types.ObjectId,
        page = 1,
        limit = 10
    ) {

        try {
            const skip = (page - 1) * limit;

            const [applications, total] = await Promise.all([
                JobApplicationModel.find({ user_id: userId })
                    .populate('job_id', 'title location') // add more job fields if needed
                    .sort({ applied_at: -1 })
                    .skip(skip)
                    .limit(limit),
                JobApplicationModel.countDocuments({ user_id: userId })
            ]);

            return {
                data: applications,
                total,
                page,
                pages: Math.ceil(total / limit)
            };
        }
        catch (error: any) {
            console.error('❌ getMyApplicationsService error:', error);
            throw new Error(`[JobApplicationService] ${error?.message}`);
        }

    }
    async getApplicationHistoryService(
        userId: Types.ObjectId,
        userRole: string,
        applicationId: string
    ) {
        try {
            // ✅ 1. Fetch the application + related job
            const application = await JobApplicationModel.findById(applicationId)
                .populate('job_id', 'posted_by title');

            if (!application) {
                throw new Error('Application not found.');
            }

            // ✅ 2. Access Control
            const isAdmin = userRole === 'admin';
            const isOwner = application.user_id.toString() === userId.toString();
            const job = application.job_id as unknown as IJobDoc;
            const isJobPoster = job?.posted_by.toString() === userId.toString();

            if (!isAdmin && !isOwner && !isJobPoster) {
                throw new Error('Unauthorized to view this application history.');
            }

            // ✅ 3. Fetch history
            const history = await JobStatusHistoryModel.find({
                application_id: applicationId
            })
                .populate('changed_by', 'name email role') // optional
                .sort({ changed_at: 1 }); // oldest to newest

            return history;
        } catch (error: any) {
            console.error('❌ getApplicationHistoryService error:', error);
            throw new Error(`[ApplicationHistoryService] ${error.message}`);
        }
    }

    async updateApplicationStatusService(
        userId: string,
        userRole: string,
        applicationId: string,
        to_status: jobStatusEnumType,
        note?: string,
        reason_code?: string
    ) {
        try {
            // ✅ Step 1: Validate status
            if (!jobStatusEnum.includes(to_status)) {
                throw new Error('Invalid status value.');
            }

            // ✅ Step 2: Fetch application and related job
            const application = await JobApplicationModel.findById(applicationId)
                .populate('job_id', 'posted_by');

            if (!application) throw new Error('Application not found.');

            const isAdmin = userRole === 'admin';
            const job = application.job_id as unknown as IJobDoc;
            const isPoster = job?.posted_by.toString() === userId.toString();

            if (!isAdmin && !isPoster) {
                throw new Error('Unauthorized to update application status.');
            }

            // ✅ Step 3: No-op if status is same
            if (application.status === to_status) {
                throw new Error('Application is already in this status.');
            }

            // ✅ Step 4: Save history log
            await JobStatusHistoryModel.create({
                application_id: application._id,
                changed_by: userId,
                from_status: application.status,
                to_status,
                note,
                reason_code
            });

            // ✅ Step 5: Update application
            application.status = to_status as unknown as typeof application.status;
            await application.save();

            return application;
        } catch (error: any) {
            console.error('❌ updateApplicationStatusService error:', error);
            throw new Error(`[UpdateStatusService] ${error.message}`);
        }

    }
}

export const jobService = new JobService();