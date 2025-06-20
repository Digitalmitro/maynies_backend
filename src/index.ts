// src/app.ts
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { connectDB } from './shared/database/connect';
import authRoutes from './modules/auth/routes/auth.route';
import userRoutes from './modules/user/routes/user.route';
import jobRoutes from './modules/job/routes/job.route';
import crmRoutes from './modules/crm/routes/crm.routes';
import { seedRoles } from './scripts/seedRoles';
import { errorHandler } from './shared/middleware/errorMiddleWare';
import cors from 'cors';
// import rateLimit from 'express-rate-limit';





async function start() {

    // 1) DB connect
    await connectDB();
    await seedRoles();

    // 2) Express init
    const app = express();

    app.set('trust proxy', true);
    // app.use(rateLimit({
    //     windowMs: 15 * 60 * 1000, // 15 minutes
    //     max: 100, // Limit each IP to 100 requests per windowMs      
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true, // Allow cookies to be sent with requests
    }));
    app.use(express.json());
    app.use(cookieParser());

    // 3) Simple health-check route
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/employer', crmRoutes);


    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'OK', message: 'Server is healthy!' });
    });


    app.use(errorHandler); // always at the end


    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

start();
