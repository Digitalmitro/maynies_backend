// src/app.ts
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { connectDB } from './shared/database/connect';
import authRoutes from './modules/auth/routes/auth.route';
import userRoutes from './modules/user/routes/user.route';
import jobRoutes from './modules/job/routes/job.route';
import crmRoutes from './modules/crm/routes/crm.routes';
import studentRoutes from './modules/student/routes/student.route';
import uploadRoutes from './modules/upload/routes/upload.route';
import courseRoutes from './modules/courses/routes/course.route';
import paymentRoutes from './modules/courses/routes/coursePayment.route';
import { seedRoles } from './scripts/seedRoles';
import { errorHandler } from './shared/middleware/errorMiddleWare';
import cors from 'cors';
import path from 'path';
import { stripeWebhook } from './modules/courses/controllers/payment.controller';





async function start() {

    // 1) DB connect
    await connectDB();
    await seedRoles();

    // 2) Express init
    const app = express();

    app.set('trust proxy', true);


    // app.use(cors({"*"}));
    app.use(cors({
        origin: '*'
    }));


    app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => { stripeWebhook(req, res) });

    app.use(express.json());
    app.use(cookieParser());

    app.use('/api/uploads', express.static(path.join(__dirname, '../uploads'), {
        index: false
    }));


    // 3) Simple health-check route
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/employer', crmRoutes);
    app.use('/api/student', studentRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/upload', uploadRoutes);


    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'OK', message: 'Server is healthy!' });
    });

    app.use((req, res, next) => {
        res.status(404).json({
            status: 'error',
            message: 'Route not found'
        });
    });

    app.use(errorHandler); // always at the end


    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

start();
