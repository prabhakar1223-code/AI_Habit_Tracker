
import express from "express";

import {
  markComplete,
  unmarkComplete,
  getToday,
  getRange,
  getHeatMap,
  getHabitStats,
  getAllStats,
} from "../controllers/logController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Habit completion
router.post("/", markComplete);
router.delete("/", unmarkComplete);

// Habit logs
router.get("/today", getToday);
router.get("/range", getRange);
router.get("/heatmap", getHeatMap);

// Habit statistics
router.get("/stats", getAllStats);
router.get("/stats/:habitId", getHabitStats);

export default router;
