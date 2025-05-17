import express from "express";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from './utils/ApiError.js'; // Adjust the path to where your ApiError class is defined

const app = express();

// Middlewares 

const whitelist = [
  process.env.CORS_ORIGIN_LOCAL,
  process.env.CORS_ORIGIN_PROD
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cookieParser());

app.use(express.json({ limit: '16kb' }));

app.use(express.urlencoded({ extended: true, limit: '16kb' }));

app.use(express.static('public'));

// Routes import
import authRoute from './routes/auth.route.js';
import adminRoute from './routes/admin.route.js';
import teacherRoute from './routes/teacher.route.js';
import parentRoute from './routes/parent.route.js';
import studentRoute from './routes/student.route.js';
import classRoute from './routes/class.route.js';
import attendanceRoute from './routes/attendance.route.js';
import subjectRoute from './routes/subject.route.js';
import marksRoute from './routes/marks.route.js';
import announcementRoute from './routes/announcement.route.js';
import geminiRoute from './routes/gemini.route.js';
import voucherRoute from './routes/voucher.route.js';
import paymentRoute from './routes/stripe.route.js';
import activityLogRoute from './routes/activityLog.route.js';
import reportsRoute from './routes/reports.route.js';

// Routes declaration
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/admin', adminRoute);
app.use('/api/v1/teacher', teacherRoute);
app.use('/api/v1/parent', parentRoute);
app.use('/api/v1/student', studentRoute);
app.use('/api/v1/class', classRoute);
app.use('/api/v1', attendanceRoute);
app.use('/api/v1/subject', subjectRoute);
app.use('/api/v1/marks', marksRoute);
app.use('/api/v1', announcementRoute);
app.use('/api/v1/', geminiRoute);
app.use('/api/v1/voucher', voucherRoute);
app.use('/api/v1/', paymentRoute);
app.use('/api/v1/', activityLogRoute);
app.use('/api/v1/reports', reportsRoute);


// Error-handling middleware (ADD HERE, AFTER ALL ROUTES AND MIDDLEWARE)
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false, // Align with ApiError's success property
      message: err.message, // e.g., "SchoolOrCollegeName already taken"
      errors: err.errors // Include additional errors if any
    });
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    errors: []
  });
});

export { app };