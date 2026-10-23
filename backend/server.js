
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRouter from './routes/authRouter.js';
import habitRouter from './routes/habitRouter.js';
import logRouter from './routes/logRouter.js';
import aiRouter from "./routes/aiRouter.js"
import {
  notFound,
  errorHandler
} from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL ? [new URL(process.env.CLIENT_URL).origin] : [])
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }

    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Register your API routes above these middleware functions.

// Handle unknown routes and application errors
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running successfully!"
  });
});
app.use("/api/auth", authRouter);
app.use("/api/habits",habitRouter);
app.use("/api/logs",logRouter);
app.use("/api/ai",aiRouter);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
