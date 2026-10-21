
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";

// Get all habits for the logged-in user
export const getHabits = async (req, res) => {
  try {
    const { includeArchived } = req.query;

    const filter = {
      userId: req.user._id,
    };

    if (includeArchived !== "true") {
      filter.isArchived = false;
    }

    const habits = await Habit.find(filter).sort({
      order: 1,
      createdAt: 1,
    });

    return res.status(200).json(habits);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Create a new habit
export const createHabit = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      frequency,
      targetDays,
      color,
      icon,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Habit name is required",
      });
    }

    const count = await Habit.countDocuments({
      userId: req.user._id,
    });

    const habit = await Habit.create({
      userId: req.user._id,
      name: name.trim(),
      description,
      category,
      frequency,
      targetDays,
      color,
      icon,
      order: count,
    });

    return res.status(201).json(habit);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// Update an existing habit
export const updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    const fields = [
      "name",
      "description",
      "category",
      "frequency",
      "targetDays",
      "color",
      "icon",
      "order",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        habit[field] = req.body[field];
      }
    }

    if (typeof habit.name !== "string" || !habit.name.trim()) {
      return res.status(400).json({
        message: "Habit name is required",
      });
    }

    habit.name = habit.name.trim();

    await habit.save();

    return res.status(200).json(habit);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// Delete a habit and its associated logs
export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    await HabitLog.deleteMany({
      habitId: habit._id,
      userId: req.user._id,
    });

    await Habit.deleteOne({
      _id: habit._id,
      userId: req.user._id,
    });

    return res.status(200).json({
      message: "Habit deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// Reorder habits
export const reorderHabits = async (req, res) => {
  try {
    const { order } = req.body;

    if (
      !Array.isArray(order) ||
      !order.every((id) => typeof id === "string") ||
      new Set(order).size !== order.length
    ) {
      return res.status(400).json({
        message: "Order must be an array of unique habit IDs",
      });
    }

    const habits = await Habit.find({
      _id: { $in: order },
      userId: req.user._id,
    }).select("_id");

    if (habits.length !== order.length) {
      return res.status(400).json({
        message: "One or more habit IDs are invalid or not found",
      });
    }

    await Promise.all(
      order.map((id, index) =>
        Habit.updateOne(
          {
            _id: id,
            userId: req.user._id,
          },
          {
            $set: { order: index },
          }
        )
      )
    );

    return res.status(200).json({
      message: "Habits reordered successfully",
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};



export const archiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({
        message: "Habit not found",
      });
    }

    habit.isArchived = !habit.isArchived;
    await habit.save();

    return res.status(200).json(habit);
  } catch (error) {
    console.error("Archive habit error:", error);

    return res.status(500).json({
      message: "Failed to archive habit",
    });
  }
};
