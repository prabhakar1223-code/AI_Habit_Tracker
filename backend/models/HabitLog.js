
import mongoose from 'mongoose';

const habitLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true
    },

    completedDate: {
      type: String,
      required: true
    },

    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate completion logs for the same
// user, habit, and date.
habitLogSchema.index(
  { userId: 1, habitId: 1, completedDate: 1 },
  { unique: true }
);

export default mongoose.model('HabitLog', habitLogSchema);
