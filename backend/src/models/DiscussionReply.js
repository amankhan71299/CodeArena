import mongoose from 'mongoose';

const DiscussionReplySchema = new mongoose.Schema(
  {
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Reply content is required'],
      maxlength: [3000, 'Reply cannot exceed 3000 characters']
    },
    reported: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model('DiscussionReply', DiscussionReplySchema);
