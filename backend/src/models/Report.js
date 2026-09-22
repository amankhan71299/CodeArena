import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['Discussion', 'DiscussionReply']
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Prevent duplicate reports from same user against same target
ReportSchema.index({ reporter: 1, targetModel: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Report', ReportSchema);
