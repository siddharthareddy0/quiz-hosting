import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';

import { connectDb } from './utils/connectDb.js';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import adminExamRoutes from './routes/adminExamRoutes.js';
import adminQuestionRoutes from './routes/adminQuestionRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminAssignmentRoutes from './routes/adminAssignmentRoutes.js';
import adminMonitoringRoutes from './routes/adminMonitoringRoutes.js';
import adminMalpracticeRoutes from './routes/adminMalpracticeRoutes.js';
import adminAttendanceRoutes from './routes/adminAttendanceRoutes.js';
import adminResultsRoutes from './routes/adminResultsRoutes.js';

dotenv.config();

const app = express();

function getAllowedOrigins() {
  const fromMulti = process.env.CLIENT_ORIGINS;
  if (fromMulti) {
    return fromMulti
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [process.env.CLIENT_ORIGIN || 'http://localhost:5173'];
}

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = getAllowedOrigins();
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/analysis', analysisRoutes);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/exams', adminExamRoutes);
app.use('/api/admin/exams/:examId', adminQuestionRoutes);
app.use('/api/admin/exams/:examId', adminAssignmentRoutes);
app.use('/api/admin/exams/:examId', adminResultsRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/monitoring', adminMonitoringRoutes);
app.use('/api/admin/malpractice', adminMalpracticeRoutes);
app.use('/api/admin/attendance', adminAttendanceRoutes);

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
  });
});

const port = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on :${port}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start server:', e);
    process.exit(1);
  });
