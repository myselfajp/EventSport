import dotenv from 'dotenv';
import express from 'express';
import authRouter from './routes/authRouter.js';
import participantRouter from './routes/participantRouter.js';
import referenceDataRouter from './routes/referenceDataRouter.js';
import coachRouter from './routes/couchRouter.js';
import facilityRouter from './routes/facilityRouter.js';
import companyRouter from './routes/companyRouter.js';
import refreshRouter from './routes/refreshRouter.js';
import getDataRouter from './routes/getDataRouter.js';
import adminRouter from './routes/adminRouter.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { adminMiddleware } from './middleware/adminMiddleware.js';
import globalErrorHandler from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { generateCSRFToken, validateCSRFToken } from './middleware/csrfProtection.js';
import { authRateLimiter, signupRateLimiter, generalRateLimiter } from './middleware/rateLimiter.js';
import * as authController from './controllers/authController.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

dotenv.config();
const app = express();

app.set('trust proxy', 1);

app.use(securityHeaders);

app.use(
    cors({
        origin: [
            'http://127.0.0.1:3000',
            'http://localhost:3000',
            'http://127.0.0.1:3001',
            'http://localhost:3001',
            'https://64vqzjg1-3001.inc1.devtunnels.ms'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
        exposedHeaders: ['Authorization'],
    })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(generateCSRFToken);
app.use(generalRateLimiter);

app.get('/mid', authMiddleware, (req, res) => {
    res.json({ message: `hello user ${req.user.username}` });
});

app.use('/api/v1/auth', validateCSRFToken, refreshRouter);
app.post('/api/v1/auth/sign-in', authRateLimiter, validateCSRFToken, authController.signIn);
app.post('/api/v1/auth/sign-up', signupRateLimiter, validateCSRFToken, authController.signUp);
app.use('/api/v1/auth', validateCSRFToken, authMiddleware, authRouter);
app.use('/api/v1/participant', authMiddleware, participantRouter);
app.use('/api/v1/reference-data', authMiddleware, referenceDataRouter);
app.use('/api/v1/coach', authMiddleware, coachRouter);
app.use('/api/v1/facility', authMiddleware, facilityRouter);
app.use('/api/v1/company', authMiddleware, companyRouter);
app.use('/api/v1/admin', validateCSRFToken, authMiddleware, adminMiddleware, adminRouter);
app.use('/api/v1', getDataRouter);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(globalErrorHandler);
export default app;
