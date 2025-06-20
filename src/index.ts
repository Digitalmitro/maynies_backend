// src/app.ts
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { connectDB } from './shared/database/connect';
import authRoutes from './modules/auth/routes/auth.route';
import userRoutes from './modules/user/routes/user.route';
import { seedRoles } from './scripts/seedRoles';
import cors from 'cors';

async function start() {

    // 1) DB connect
    await connectDB();
    await seedRoles();



    // 2) Express init
    const app = express();
    app.use(cors({
        origin: 'http://localhost:5173', 
        credentials: true              
      }));
    app.use(express.json());
    app.use(cookieParser());

    // 3) Simple health-check route
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);




    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'OK', message: 'Server is healthy!' });
    });



    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

start();
