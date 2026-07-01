import { httpServer } from './src/socket/socketServer.js';
import mongoose from 'mongoose';
import { initAdmin } from './src/utils/initAdmin.js';
import { initAdminPermissionGroups } from './src/utils/initAdminPermissionGroups.js';
import { initLegal } from './src/utils/initLegal.js';
import { initLocations } from './src/utils/initLocations.js';
import { startCheckInReminderScheduler } from './src/utils/checkInReminderJob.js';
import { startAccountAnonymizationScheduler } from './src/utils/accountAnonymizationJob.js';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const startServer = async () => {
    try {
        // httpServer hem Express app'i hem socket.io'yu barındırır.
        httpServer.listen(PORT, () => {
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
        await initAdminPermissionGroups();
        await initLegal();
        await initLocations();
        startCheckInReminderScheduler();
        startAccountAnonymizationScheduler();
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1); // stop app if DB fails
    }
};

startServer();
connectDB();
