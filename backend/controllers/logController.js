
import HabitLog from "../models/HabitLog.js";
import Habit from "../models/Habit.js";
import {
  todayKey,
  last90Days,
  calcStreak,
} from "../utils/dateHelpers.js";
import {
  isValid,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import mongoose from "mongoose";

// Validate YYYY-MM-DD date strings
const isValidDateKey = (date) => {
  if (typeof date !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

// Mark a habit as complete
export const markComplete = async (req, res) => {
  try {
    const { habitId, date } = req.body;
    const completedDate = date || todayKey();

    if (!mongoose.isValidObjectId(habitId)) {
      return res.status(400).json({
        message: "Valid habit ID is required",
      });
    }

    if (!isValidDateKey(completedDate)) {
      return res.status(400).json({
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    const log = await HabitLog.findOneAndUpdate(
      {
        userId: req.user._id,
        habitId: habit._id,
        completedDate,
      },
      {
        $setOnInsert: {
          userId: req.user._id,
          habitId: habit._id,
          completedDate,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json(log);
  } catch (err) {
    if (err.code === 11000) {
      const { habitId, date } = req.body;

      const log = await HabitLog.findOne({
        userId: req.user._id,
        habitId,
        completedDate: date || todayKey(),
      });

      if (log) {
        return res.status(200).json(log);
      }
    }

    return res.status(500).json({
      message: err.message,
    });
  }
};

// Undo a habit completion
export const unmarkComplete = async (req, res) => {
  try {
    const { habitId, date } = req.body;
    const completedDate = date || todayKey();

    if (!mongoose.isValidObjectId(habitId)) {
      return res.status(400).json({
        message: "Valid habit ID is required",
      });
    }

    if (!isValidDateKey(completedDate)) {
      return res.status(400).json({
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    await HabitLog.findOneAndDelete({
      userId: req.user._id,
      habitId: habit._id,
      completedDate,
    });

    return res.status(200).json({
      message: "Habit completion removed",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Get today's completed habits
export const getToday = async (req, res) => {
  try {
    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: todayKey(),
    }).sort({ createdAt: -1 });

    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Get habit logs within a date range
export const getRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    console.log("getRange called:", { start, end });

    if (!isValidDateKey(start) || !isValidDateKey(end)) {
      return res.status(400).json({
        message: "Valid start and end dates are required (YYYY-MM-DD)",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "Start date must not be after end date",
      });
    }

    console.log("Date validation passed");

    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: {
        $gte: start,
        $lte: end,
      },
    }).sort({ completedDate: 1 });

    console.log("getRange successful. Logs found:", logs.length);

    return res.status(200).json(logs);
  } catch (err) {
    console.error("getRange error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};
// Get the last 90 days of completion activity
export const getHeatMap = async (req, res) => {
  try {
    const days = last90Days();

    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: {
        $gte: days[0],
        $lte: days[days.length - 1],
      },
    }).select("completedDate");

    const counts = Object.fromEntries(
      days.map((day) => [day, 0])
    );

    for (const log of logs) {
      counts[log.completedDate] =
        (counts[log.completedDate] || 0) + 1;
    }

    const data = days.map((date) => ({
      date,
      count: counts[date],
    }));

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Get statistics for one habit
export const getHabitStats = async (req, res) => {
  try {
    const { habitId } = req.params;

    if (!mongoose.isValidObjectId(habitId)) {
      return res.status(400).json({
        message: "Valid habit ID is required",
      });
    }

    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    const logs = await HabitLog.find({
      userId: req.user._id,
      habitId: habit._id,
    }).sort({ completedDate: -1 });

    const dateKeys = logs.map((log) => log.completedDate);
    const { current, longest } = calcStreak(dateKeys);

    const createdDate = habit.createdAt
      ? habit.createdAt.toISOString().slice(0, 10)
      : todayKey();

    const totalDays = Math.max(
      1,
      differenceInCalendarDays(
        parseISO(todayKey()),
        parseISO(createdDate)
      ) + 1
    );

    const completionRate = Math.min(
      100,
      Math.round((new Set(dateKeys).size / totalDays) * 100)
    );

    const monthly = {};

    for (const log of logs) {
      const month = log.completedDate.slice(0, 7);
      monthly[month] = (monthly[month] || 0) + 1;
    }

    return res.status(200).json({
      habit,
      totalCompletions: logs.length,
      currentStreak: current,
      longestStreak: longest,
      completionRate,
      monthly,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Get overall statistics for the logged-in user

export const getAllStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = todayKey();

    const [totalHabits, completedToday, totalCompletions, logs] =
      await Promise.all([
        Habit.countDocuments({
          userId,
          isArchived: false,
        }),

        HabitLog.countDocuments({
          userId,
          completedDate: today,
        }),

        HabitLog.countDocuments({ userId }),

        HabitLog.find({ userId })
          .select("habitId completedDate")
          .sort({ completedDate: -1 }),
      ]);

    // Group completion dates by habit
    const habitDates = new Map();

    for (const log of logs) {
      const id = log.habitId.toString();

      if (!habitDates.has(id)) {
        habitDates.set(id, []);
      }

      habitDates.get(id).push(log.completedDate);
    }

    // Calculate overall streaks
    let currentStreak = 0;
    let longestStreak = 0;

    for (const dates of habitDates.values()) {
      const streak = calcStreak(dates);

      currentStreak += streak.current;
      longestStreak = Math.max(longestStreak, streak.longest);
    }

    // Get active habits
    const habits = await Habit.find({
      userId,
      isArchived: false,
    }).select("_id name icon color category");

    // Calculate statistics for each habit
    const todayDate = new Date(`${today}T00:00:00`);

    const perHabit = habits.map((habit) => {
      const dates = habitDates.get(habit._id.toString()) || [];
      const streak = calcStreak(dates);

      const completions30d = dates.filter((date) => {
        const completedDate = new Date(`${date}T00:00:00`);
        const diffDays =
          (todayDate - completedDate) / (1000 * 60 * 60 * 24);

        return diffDays >= 0 && diffDays < 30;
      }).length;

      return {
        habitId: habit._id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        category: habit.category,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        completions30d,
      };
    });

    return res.status(200).json({
      totalHabits,
      completedToday,
      remainingToday: Math.max(0, totalHabits - completedToday),
      totalCompletions,
      currentStreak,
      longestStreak,
      perHabit,
    });
  } catch (err) {
    console.error("Get all stats error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};
