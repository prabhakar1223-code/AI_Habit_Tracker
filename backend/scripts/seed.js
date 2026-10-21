
import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config({ path: "../.env" });

import User from "../models/User.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";

dotenv.config();

const HABIT_SEEDS = [
  {
    name: "Morning Walk",
    description: "Walk for 20 minutes every morning.",
    category: "Fitness",
    frequency: "daily",
    targetDays: 7,
    icon: "🚶",
    color: "#22c55e",
    order: 1,
    pattern: "consistent",
  },
  {
    name: "Drink Water",
    description: "Stay hydrated throughout the day.",
    category: "Health",
    frequency: "daily",
    targetDays: 7,
    icon: "💧",
    color: "#06b6d4",
    order: 2,
    pattern: "daily",
  },
  {
    name: "Read Books",
    description: "Read at least 10 pages every day.",
    category: "Learning",
    frequency: "daily",
    targetDays: 7,
    icon: "📚",
    color: "#3b82f6",
    order: 3,
    pattern: "strong",
  },
  {
    name: "Meditation",
    description: "Meditate for 10 minutes.",
    category: "Mindfulness",
    frequency: "daily",
    targetDays: 7,
    icon: "🧘",
    color: "#a855f7",
    order: 4,
    pattern: "inconsistent",
  },
  {
    name: "Coding Practice",
    description: "Solve a programming problem.",
    category: "Learning",
    frequency: "daily",
    targetDays: 7,
    icon: "💻",
    color: "#f97316",
    order: 5,
    pattern: "strong",
  },
  {
    name: "Journal Writing",
    description: "Write down thoughts and daily progress.",
    category: "Mindfulness",
    frequency: "daily",
    targetDays: 5,
    icon: "📔",
    color: "#ec4899",
    order: 6,
    pattern: "inconsistent",
  },
  {
    name: "No Social Media",
    description: "Avoid unnecessary social media scrolling.",
    category: "Productivity",
    frequency: "daily",
    targetDays: 7,
    icon: "📵",
    color: "#64748b",
    order: 7,
    pattern: "rare",
  },
  {
    name: "Morning Study",
    description: "Study a difficult topic for 30 minutes.",
    category: "Learning",
    frequency: "daily",
    targetDays: 7,
    icon: "🎯",
    color: "#6366f1",
    order: 8,
    pattern: "daily",
  },
  {
    name: "Save Money",
    description: "Record expenses and review spending.",
    category: "Finance",
    frequency: "daily",
    targetDays: 5,
    icon: "💰",
    color: "#16a34a",
    order: 9,
    pattern: "inconsistent",
  },
  {
    name: "Creative Practice",
    description: "Spend 15 minutes on a creative activity.",
    category: "Creative",
    frequency: "daily",
    targetDays: 4,
    icon: "🎨",
    color: "#d946ef",
    order: 10,
    pattern: "none",
  },
  {
    name: "Call Family",
    description: "Connect with family or friends.",
    category: "Social",
    frequency: "weekly",
    targetDays: 3,
    icon: "📞",
    color: "#eab308",
    order: 11,
    pattern: "weekly",
  },
  {
    name: "Healthy Cooking",
    description: "Prepare a healthy meal at home.",
    category: "Health",
    frequency: "daily",
    targetDays: 5,
    icon: "🥗",
    color: "#84cc16",
    order: 12,
    pattern: "inconsistent",
  },
];

// Determines which dates receive completion logs.
const shouldComplete = (pattern, daysAgo) => {
  switch (pattern) {
    case "daily":
      return true;

    case "consistent":
      return daysAgo === 0 || daysAgo % 7 !== 3;

    case "strong":
      return daysAgo <= 5 || daysAgo % 4 !== 2;

    case "inconsistent":
      return daysAgo % 3 === 0 || daysAgo % 7 === 1;

    case "rare":
      return daysAgo === 0 || daysAgo % 6 === 0;

    case "weekly":
      return daysAgo % 3 === 0;

    case "none":
    default:
      return false;
  }
};

// Produces a local calendar date in YYYY-MM-DD format.
const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const seed = async () => {
  try {
    // 1. Validate environment variables.
    if (!process.env.MONGO_URL) {
      throw new Error(
        "MONGO_URI is missing from your backend .env file."
      );
    }

    // 2. Read the registered user's email from the command line.
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
      throw new Error(
        "Provide your registered email: node seed.js your@email.com"
      );
    }

    // 3. Connect to MongoDB.
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected successfully.");

    // 4. Find the registered user.
    // .select("+password") works when the schema marks password as select: false.
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new Error(
        `No user found for ${email}. Register first or check your email.`
      );
    }

    const userId = user._id;

    // 5. Safe account diagnostics. Never print the real password or hash.
    console.log("\n--- Account Details ---");
    console.log("Email:", user.email);
    console.log("User ID:", userId.toString());
    console.log("Password hash exists:", Boolean(user.password));
    console.log("-----------------------\n");

    // 6. Create or update the 12 habits for this user.
    const seededHabits = [];

    for (const item of HABIT_SEEDS) {
      const { pattern, ...habitData } = item;

      let habit = await Habit.findOne({
        userId,
        name: habitData.name,
      });

      if (habit) {
        Object.assign(habit, habitData, {
          userId,
          isArchived: false,
        });

        await habit.save();
      } else {
        habit = await Habit.create({
          ...habitData,
          userId,
          isArchived: false,
        });
      }

      seededHabits.push({ habit, pattern });
    }

    console.log(
      `Habits created or updated: ${seededHabits.length}`
    );

    // 7. Remove existing completion logs for these seeded habits only.
    // Running this script again rebuilds their demo history.
    const seededHabitIds = seededHabits.map(({ habit }) => habit._id);

    await HabitLog.deleteMany({
      userId,
      habitId: { $in: seededHabitIds },
    });

    // 8. Generate completion logs for today and the previous 44 days.
    const today = new Date();
    const logs = [];

    for (let daysAgo = 44; daysAgo >= 0; daysAgo--) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);

      const completedDate = localDateKey(date);

      for (const { habit, pattern } of seededHabits) {
        if (!shouldComplete(pattern, daysAgo)) {
          continue;
        }

        logs.push({
          userId,
          habitId: habit._id,
          completedDate,
        });
      }
    }

    // 9. Insert generated history.
    if (logs.length > 0) {
      await HabitLog.insertMany(logs);
    }

    // 10. Display summary.
    console.log("\n========== SEED SUMMARY ==========");
    console.log("Status: Success");
    console.log("Account:", email);
    console.log("Habits:", seededHabits.length);
    console.log("Completion logs:", logs.length);
    console.log("History: Today + previous 44 days");
    console.log("Password: Not printed for security");
    console.log("==================================\n");
  } catch (error) {
    console.error("\nSeed failed:", error.message);
    process.exitCode = 1;
  } finally {
    // 11. Close the database connection.
    await mongoose.disconnect().catch(() => {});
  }
};

seed();
