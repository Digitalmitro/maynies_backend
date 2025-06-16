
import mongoose from 'mongoose';
import { dbConfig } from '../../config/db';


export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(dbConfig.uri, {

        });
        console.log('✅ MongoDB connected:', dbConfig.uri);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);  // agar DB nahi chali, process ko bandh kar do
    }
}
