
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AiInsights.js";

import {
  chatCompletion,
  SYSTEM_PROMPTS,
} from "../utils/AiService.js";

import { calcStreak, lastNDays, toDateKey } from "../utils/dateHelpers.js";

const buildWeeklyContext = async (userId) => {
  const habits = await Habit.find({
    userId,
    isArchived: false,
  });

  const days = lastNDays(7);

  const logs = await HabitLog.find({
    userId,
    completedDate: {
      $gte: days[0],
      $lte: days[days.length - 1],
    },
  });

  const perHabit = habits.map((habit) => {
    const completed = logs.filter(
      (log) => String(log.habitId) === String(habit._id)
    ).length;

    return {
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      completedDays: completed,
      targetDays: habit.targetDays,
    };
  });

  return { days, perHabit };
};

export const weeklyReport = async (req, res) => {
  try {
    const ctx = await buildWeeklyContext(req.user._id);

    if (!ctx.perHabit.length) {
      return res.status(200).json({
        content:
          "You don't have any active habits yet. Create your first habit to start tracking your progress!",
      });
    }

    const userMsg = `
Here is the user's habit data for the past 7 days
(${ctx.days[0]} to ${ctx.days[6]}):

${ctx.perHabit
  .map(
    (habit) =>
      `- ${habit.name} (${habit.category}, ${habit.frequency}): completed ${habit.completedDays} days out of 7. Target: ${habit.targetDays} days.`
  )
  .join("\n")}

Please write a personalized weekly report.
`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.weekly,
      user: userMsg,
    });

    if (!ok) {
      return res.status(502).json({ message: content });
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "weekly",
      content,
    });

    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const suggestHabit = async (req, res) => {
  try {
    const { goals, productiveTime, struggles } = req.body;

    const userMsg = `
User goals: ${goals || "not provided"}
Most productive time: ${productiveTime || "not provided"}
Past struggles: ${struggles || "not provided"}

Suggest 3 personalized habits.
Return valid JSON in this format:
{
  "suggestions": [
    {
      "name": "Habit name",
      "description": "Short description",
      "frequency": "daily",
      "category": "Fitness",
      "icon": "🚶",
      "reason": "Why this habit is useful"
    }
  ]
}
`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.suggestion,
      user: userMsg,
    });

   
if (!ok) {
  console.error("AI unavailable:", content);

  const fallbackSuggestions = [
    {
      name: "10-minute morning walk",
      description: "Start the day with light movement and fresh air.",
      frequency: "daily",
      category: "Fitness",
      icon: "🚶",
      reason: "A simple way to build consistency.",
    },
    {
      name: "Read 5 pages",
      description: "Read a few pages every day.",
      frequency: "daily",
      category: "Learning",
      icon: "📚",
      reason: "Small daily sessions build knowledge.",
    },
    {
      name: "Plan tomorrow for 5 minutes",
      description: "Write down your priorities for tomorrow.",
      frequency: "daily",
      category: "Productivity",
      icon: "📝",
      reason: "Helps you start the next day with clarity.",
    },
  ];

  return res.status(200).json(fallbackSuggestions);
}


    let suggestions = [];

    try {
      const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

      const parsed = JSON.parse(cleaned);
      suggestions = parsed.suggestions || [];
    } catch (err) {
      suggestions = [];
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = [
        {
          name: "10-minute morning walk",
          description: "Start the day with light movement and fresh air.",
          frequency: "daily",
          category: "Fitness",
          icon: "🚶",
          reason: "A simple way to build consistency.",
        },
        {
          name: "Read 5 pages",
          description: "Read a few pages every day to build a learning routine.",
          frequency: "daily",
          category: "Learning",
          icon: "📚",
          reason: "Small daily sessions build knowledge over time.",
        },
        {
          name: "Plan tomorrow for 5 minutes",
          description: "Write down your top priorities for the next day.",
          frequency: "daily",
          category: "Productivity",
          icon: "📝",
          reason: "Helps you start the next day with clarity.",
        },
      ];
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "suggestion",
      content: JSON.stringify(suggestions),
      meta: {
        goals,
        productiveTime,
        struggles,
      },
    });

    return res.status(200).json(suggestions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



export const recoveryPlan = async (req, res) => {
  try {
    const { habitId } = req.body;

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

    const keys = logs.map((l) => l.completedDate);

    const { current, longest } = calcStreak(keys);

    const userMsg = `
Habit: ${habit.name} (${habit.category}).
Description: ${habit.description || "None"}.
Frequency: ${habit.frequency}.
Target days: ${habit.targetDays}.
Current streak: ${current} days.
Longest streak: ${longest} days.
Recent completion dates: ${keys.slice(0, 7).join(", ") || "No completions"}.

Create a practical, personalized 3-day recovery plan.
Include one small action for each day and advice for rebuilding consistency.
Be supportive and non-judgmental.
`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.recovery,
      user: userMsg,
    });

    if (!ok) {
      return res.status(502).json({
        message: content,
      });
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "recovery",
      content,
      meta: {
        habitId: habit._id,
        currentStreak: current,
        longestStreak: longest,
      },
    });

    return res.status(200).json({
      habit: habit.name,
      currentStreak: current,
      longestStreak: longest,
      content,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};



export const chatAnalysis = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    // Get the last 30 days
    const days = lastNDays(30);

    // Fetch the user's active habits
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    });

    // Fetch completion logs for the last 30 days
    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: {
        $gte: days[0],
        $lte: days[days.length - 1],
      },
    });

    // Build context for the AI
    const context = habits
      .map((h) => {
        const hLogs = logs.filter(
          (l) => String(l.habitId) === String(h._id)
        );

        const byDow = [0, 0, 0, 0, 0, 0, 0];

        for (const l of hLogs) {
          const dow = new Date(l.completedDate).getDay();
          byDow[dow]++;
        }

        return `${h.name} (${h.category}): ${
          hLogs.length
        } completions in the last 30 days.
        Completions by weekday [Sun, Mon, Tue, Wed, Thu, Fri, Sat]: ${byDow.join(", ")}`;
      })
      .join("\n");

    const userMsg = `
User question: "${question}"

User habit data (last 30 days):
${context || "No active habits or completion data available."}

Answer the user's question using their data.
Be clear, practical, and supportive.
`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.chat,
      user: userMsg,
    });

    if (!ok) {
      return res.status(502).json({
        message: content,
      });
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "chat",
      content,
      meta: { question },
    });

    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};



const MORNING_THEMES = [
  "discipline over motivation",
  "celebrating small wins",
  "building self-trust",
  "starting fresh after setbacks",
  "protecting focus from distractions",
  "patience and long-term growth",
  "taking action before feeling ready",
  "consistency instead of perfection",
  "learning from yesterday",
  "choosing one meaningful priority",
];

const normalizeMessage = (text = "") =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "");


export const morningMotivation = async (req, res) => {
  try {
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    });

    if (!habits.length) {
      return res.status(200).json({
        content:
          "Good morning! Add your first habit today and let's get the momentum started.",
      });
    }

    const days = lastNDays(30);

    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: {
        $gte: days[0],
        $lte: days[days.length - 1],
      },
    });

    const today = toDateKey(new Date());

    const ctx = habits
      .map((h) => {
        const hLogs = logs
          .filter((l) => String(l.habitId) === String(h._id))
          .map((l) => l.completedDate);

        const { current, longest } = calcStreak(hLogs);

        return `${h.name}: current streak ${current} days, longest streak ${longest} days`;
      })
      .join("\n");

    const todayLogs = logs.filter(
      (l) => toDateKey(l.completedDate) === today
    );

    const done = new Set(
      todayLogs.map((l) => String(l.habitId))
    ).size;

    // Get the user's recent motivational messages.
    const previousInsights = await AIInsight.find({
      userId: req.user._id,
      type: "morning",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("content meta");

    const previousMessages = previousInsights
      .map((item) => item.content)
      .filter(Boolean);

    const usedThemes = previousInsights
      .map((item) => item.meta?.theme)
      .filter(Boolean);

    // Prefer a theme that has not been used recently.
    let availableThemes = MORNING_THEMES.filter(
      (theme) => !usedThemes.includes(theme)
    );

    if (!availableThemes.length) {
      const lastTheme = usedThemes[0];

      availableThemes = MORNING_THEMES.filter(
        (theme) => theme !== lastTheme
      );
    }

    const theme =
      availableThemes[
        Math.floor(Math.random() * availableThemes.length)
      ];

    const userMsg = `
Today's date: ${today}
Today's motivational theme: ${theme}

Habit progress:
${ctx}

Completed habits today: ${done}/${habits.length}.

Write a personalized morning motivational message in 30-60 words.

Focus on today's theme and the user's actual progress.
Use a fresh opening and different practical advice.
Include one small action the user can take today.
Do not copy or repeat any previous message.

Previous messages:
${previousMessages.slice(0, 10).join("\n---\n")}

Make this message noticeably different from the previous messages.
`;

    let content = "";
    let duplicate = false;

    // Retry if the exact same message is generated.
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await chatCompletion({
        system: SYSTEM_PROMPTS.morning,
        user:
          userMsg +
          (attempt > 0
            ? "\nYour last response was repetitive. Change the opening, central idea, and suggested action."
            : ""),
        temperature: 0.9,
      });

      if (!result.ok) {
        return res.status(502).json({
          message: result.content,
        });
      }

      content = result.content.trim();

      duplicate = previousMessages.some(
        (previous) =>
          normalizeMessage(previous) === normalizeMessage(content)
      );

      if (content && !duplicate) {
        break;
      }

      content = "";
    }

    if (!content) {
      return res.status(502).json({
        message:
          "Could not generate a new motivational message. Please try again.",
      });
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "morning",
      content,
      meta: {
        theme,
        generatedAt: new Date(),
      },
    });

    return res.status(200).json({
      content,
      theme,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error("Morning motivation error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};
