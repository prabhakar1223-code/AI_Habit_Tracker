
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

// Convert a date to YYYY-MM-DD format
export const toDateKey = (date) => format(date, "yyyy-MM-dd");

// Get today's date key
export const todayKey = () => toDateKey(new Date());

// Get the last 90 days, including today
export const last90Days = () => {
  const end = new Date();
  const start = subDays(end, 89);

  return eachDayOfInterval({ start, end }).map(toDateKey);
};

// Get the current week (Monday to Sunday)
export const currentWeekKeys = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });

  return eachDayOfInterval({ start, end }).map(toDateKey);
};

// Get the last N days, including today
export const lastNDays = (n) => {
  if (!Number.isInteger(n) || n < 1) {
    return [];
  }

  const end = new Date();
  const start = subDays(end, n - 1);

  return eachDayOfInterval({ start, end }).map(toDateKey);
};

// Calculate current and longest habit streaks
export const calcStreak = (dateKeys) => {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Remove duplicate dates
  const dateSet = new Set(dateKeys);

  const today = todayKey();
  const yesterday = toDateKey(subDays(new Date(), 1));

  // Calculate current streak
  let current = 0;

  let cursor = dateSet.has(today)
    ? new Date()
    : dateSet.has(yesterday)
      ? subDays(new Date(), 1)
      : null;

  while (cursor && dateSet.has(toDateKey(cursor))) {
    current++;
    cursor = subDays(cursor, 1);
  }

  // Calculate longest streak
  const sortedAsc = [...dateSet].sort();

  let longest = 0;
  let run = 0;
  let previous = null;

  for (const key of sortedAsc) {
    if (previous !== null) {
      const difference = differenceInCalendarDays(
        parseISO(key),
        parseISO(previous)
      );

      run = difference === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }

    longest = Math.max(longest, run);
    previous = key;
  }

  return { current, longest };
};
