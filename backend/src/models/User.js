import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    globalScore: { type: Number, default: 0 },
    problemsSolvedCount: { type: Number, default: 0 },
    bio: { type: String, default: '', maxlength: 500 },
    avatar: { type: String, default: '' }
  },
  { timestamps: true }
);

UserSchema.index({ globalScore: -1, problemsSolvedCount: -1, createdAt: 1 });

export default mongoose.model('User', UserSchema);
