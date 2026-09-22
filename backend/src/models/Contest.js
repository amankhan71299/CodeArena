import mongoose from 'mongoose';

const ContestProblemSchema = new mongoose.Schema({
  problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  order: { type: Number, required: true },
  points: { type: Number, required: true, min: [0, 'Points cannot be negative'] }
}, { _id: false });

const ContestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true, min: [1, 'Duration must be at least 1 minute'] }, // in minutes
  published: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  isFinalized: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problems: { type: [ContestProblemSchema], default: [] }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ContestSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startTime) return 'UPCOMING';
  if (now >= this.startTime && now < this.endTime) return 'RUNNING';
  return 'ENDED';
});

// Validation to ensure endTime is after startTime
ContestSchema.pre('validate', function() {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time.');
  }
});

export default mongoose.model('Contest', ContestSchema);
