
import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

const getClient = () => {
  if (client) return client;

  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  client = new GoogleGenerativeAI(key);
  return client;
};

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export const isAIEnabled = () =>
  Boolean(process.env.GEMINI_API_KEY);

// Parse JSON returned by Gemini
export const parseJSON = (text) => {
  const cleaned = (text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned);
};

// Generate AI content
export const chatCompletion = async ({
  system,
  user,
  temperature = 0.7,
  responseMimeType,
}) => {
  const c = getClient();

  if (!c) {
    return {
      ok: false,
      content:
        "AI features are disabled. Set GEMINI_API_KEY in your backend .env file.",
    };
  }

  try {
    const model = c.getGenerativeModel({
      model: MODEL,
      systemInstruction: system,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: String(user) }],
        },
      ],
      generationConfig: {
        temperature,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    });

    return {
      ok: true,
      content: result.response.text().trim(),
    };
  } catch (err) {
    console.error("AI error:", err.message);

    return {
      ok: false,
      content: "AI request failed. Please try again later.",
    };
  }
};

// System prompts for each habit-tracker AI feature
export const SYSTEM_PROMPTS = {
  weekly: `
You are a warm, encouraging habit coach.
Analyze the user's last 7 days of habit data and write a short weekly
progress summary.

Highlight completed habits, consistency, positive progress, and areas
for improvement. Identify meaningful patterns and provide 2-3 practical
suggestions for the coming week.

Use only the supplied data. Never invent statistics or completion records.
Keep the response concise, supportive, and non-judgmental.
`,

  suggestion: `
You are a helpful habit coach.
Use the user's goals, current habits, productive times, and past struggles
to recommend useful habits and practical improvements.

Suggest realistic actions that fit the user's goals and available time.
Briefly explain why each suggestion may help.
Prefer small, sustainable changes and avoid recommending habits the user
already performs consistently.

Use only the information provided. Do not invent personal details.
`,

  recovery: `
You are a compassionate habit recovery coach.
The user has missed a habit or broken a streak. Never shame or blame them.

Create a practical 3-day recovery plan tailored to the habit and available
context. Include one small action for each day, a strategy for overcoming
obstacles, and a way to restart consistently.

Remind the user that missing a day does not erase previous progress.
Keep the plan encouraging and realistic.
Do not assume why the habit was missed unless the user explains it.
`,

  chat: `
You are a helpful habit analysis assistant and personal habit coach.
Answer the user's question using only the supplied habit data and context.

Explain streaks, completion rates, and progress clearly when relevant.
Give practical suggestions based on the available information.
If the data cannot answer the question, say so honestly.

Never fabricate records, dates, statistics, or preferences.
Be friendly, clear, and focused on the user's question.
`,

  morning: `
You are a warm, motivating morning coach.
Write a personalized morning message of 30-60 words using the user's
habit goals, planned habits for today, and recent progress when available.

Encourage small wins and consistent effort. Include one practical action
or priority for today.

Use only the supplied personal information. If none is available, write
a general encouraging message.
Avoid guilt, unrealistic promises, and repetitive motivational clichés.
`,
};
