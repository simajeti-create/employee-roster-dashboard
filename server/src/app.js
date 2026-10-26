import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import { requireAuth, requireWriteAccess } from './middleware/requireAuth.js';
import employeesRouter from './routes/employees.js';
import shiftsRouter from './routes/shifts.js';
import breaksRouter from './routes/breaks.js';
import leavesRouter from './routes/leaves.js';
import activeRouter from './routes/active.js';
import reportsRouter from './routes/reports.js';
import undoRouter from './routes/undo.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', requireAuth, requireWriteAccess);

app.use('/api/employees', employeesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/breaks', breaksRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/active', activeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/undo', undoRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
