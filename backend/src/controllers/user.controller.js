import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Discussion from '../models/Discussion.js';
import DiscussionReply from '../models/DiscussionReply.js';

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username globalScore problemsSolvedCount bio avatar createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const discussionCount = await Discussion.countDocuments({ user: user._id });
    const replyCount = await DiscussionReply.countDocuments({ user: user._id });

    // Dynamically calculate Global Rank
    let globalRank = 'Unranked';
    const isRankable = user.globalScore > 0 || user.problemsSolvedCount > 0;
    
    if (isRankable) {
      const strictlyBetterCount = await User.countDocuments({
        $and: [
          { $or: [{ globalScore: { $gt: 0 } }, { problemsSolvedCount: { $gt: 0 } }] },
          {
            $or: [
              { globalScore: { $gt: user.globalScore } },
              { globalScore: user.globalScore, problemsSolvedCount: { $gt: user.problemsSolvedCount } },
              { globalScore: user.globalScore, problemsSolvedCount: user.problemsSolvedCount, createdAt: { $lt: user.createdAt } }
            ]
          }
        ]
      });
      globalRank = strictlyBetterCount + 1;
    }

    // Send the lean user object with counts appended
    res.json({
      ...user.toObject(),
      globalRank,
      discussionCount,
      replyCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      username: user.username,
      bio: user.bio,
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getUserSubmissions = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch submissions, populating problem title/slug.
    // Exclude actual code from public view to prevent cheating, unless it's the user's own profile?
    // Requirements say: "Public profiles must never expose ... source code"
    // So we'll exclude source code entirely from this public endpoint.
    
    const submissions = await Submission.find({ user: user._id })
      .populate('problem', 'title slug difficulty')
      .populate('contest', 'title slug')
      .select('-sourceCode') 
      .sort({ submittedAt: -1 })
      .limit(50); // Get latest 50 submissions for history/heatmap

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user submissions' });
  }
};
