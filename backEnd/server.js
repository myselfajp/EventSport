import app from './src/app.js';
import mongoose from 'mongoose';
import { initAdmin } from './src/utils/initAdmin.js';
import { initLegal } from './src/utils/initLegal.js';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const startServer = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to server:', err);
        process.exit(1);
    }
};

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
        
        await initAdmin();
        await initLegal();
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1); // stop app if DB fails
    }
};

startServer();
connectDB();
