import express from 'express'
import { weeklyReport,suggestHabit,recoveryPlan,chatAnalysis,morningMotivation } from '../controllers/AiController.js'

import {protect} from "../middleware/auth.js"

const router=express.Router();
router.use(protect);

router.post("/weekly-report",weeklyReport);
router.post("/suggest-habits",suggestHabit);
router.post("/recovery-plan",recoveryPlan);
router.post("/chat",chatAnalysis);
router.get("/morning",morningMotivation);

export default router;