import mongoose from 'mongoose';

const ContestParticipantSchema = new mongoose.Schema({
  contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, default: 0 },
  penalty: { type: Number, default: 0 },
  solvedCount: { type: Number, default: 0 },
  wrongSubmissionCount: { type: Number, default: 0 },
  rewardProcessed: { type: Boolean, default: false }
}, { timestamps: true });

ContestParticipantSchema.index({ contest: 1, user: 1 }, { unique: true });
ContestParticipantSchema.index({ contest: 1, score: -1, penalty: 1, updatedAt: 1 });

export default mongoose.model('ContestParticipant', ContestParticipantSchema);
