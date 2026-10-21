
import express from "express";

import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  reorderHabits,
  archiveHabit,
} from "../controllers/habitController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// Protect all habit routes
router.use(protect);

// GET /api/habits
router.get("/", getHabits);

// POST /api/habits
router.post("/", createHabit);

// PUT /api/habits/reorder
router.put("/reorder", reorderHabits);

router.put("/:id/archive", archiveHabit);
// PUT /api/habits/:id
router.put("/:id", updateHabit);

// DELETE /api/habits/:id
router.delete("/:id", deleteHabit);

export default router;
