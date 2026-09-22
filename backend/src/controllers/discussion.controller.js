import Discussion from '../models/Discussion.js';
import DiscussionReply from '../models/DiscussionReply.js';
import Report from '../models/Report.js';
import Problem from '../models/Problem.js';

export const getDiscussionsByProblem = async (req, res) => {
  try {
    const { problemId } = req.params;
    const discussions = await Discussion.find({ problem: problemId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
};

export const createDiscussion = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { title, content } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const discussion = new Discussion({
      problem: problemId,
      user: req.user.id,
      title,
      content
    });
    
    await discussion.save();
    
    const populatedDiscussion = await discussion.populate('user', 'username avatar');
    res.status(201).json(populatedDiscussion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getDiscussionById = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('user', 'username avatar');
      
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const replies = await DiscussionReply.find({ discussion: discussion._id })
      .populate('user', 'username avatar')
      .sort({ createdAt: 1 });

    res.json({ discussion, replies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discussion' });
  }
};

export const updateDiscussion = async (req, res) => {
  try {
    const { title, content } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
    
    if (discussion.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this discussion' });
    }

    discussion.title = title || discussion.title;
    discussion.content = content || discussion.content;
    await discussion.save();

    res.json(discussion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    if (discussion.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this discussion' });
    }

    await DiscussionReply.deleteMany({ discussion: discussion._id });
    await discussion.deleteOne();
    
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete discussion' });
  }
};

export const createReply = async (req, res) => {
  try {
    const { content } = req.body;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const reply = new DiscussionReply({
      discussion: discussion._id,
      user: req.user.id,
      content
    });

    await reply.save();
    
    discussion.replyCount += 1;
    await discussion.save();

    const populatedReply = await reply.populate('user', 'username avatar');
    res.status(201).json(populatedReply);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateReply = async (req, res) => {
  try {
    const { content } = req.body;
    const reply = await DiscussionReply.findById(req.params.id);
    
    if (!reply) return res.status(404).json({ error: 'Reply not found' });
    
    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this reply' });
    }

    reply.content = content || reply.content;
    await reply.save();

    res.json(reply);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteReply = async (req, res) => {
  try {
    const reply = await DiscussionReply.findById(req.params.id);
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this reply' });
    }

    const discussion = await Discussion.findById(reply.discussion);
    if (discussion) {
      discussion.replyCount = Math.max(0, discussion.replyCount - 1);
      await discussion.save();
    }

    await reply.deleteOne();
    res.json({ message: 'Reply deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reply' });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const index = discussion.likes.indexOf(req.user.id);
    if (index === -1) {
      discussion.likes.push(req.user.id);
    } else {
      discussion.likes.splice(index, 1);
    }
    
    await discussion.save();
    res.json({ likes: discussion.likes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const reportContent = (targetModel) => async (req, res) => {
  try {
    const { reason } = req.body;
    const targetId = req.params.id;

    let target;
    if (targetModel === 'Discussion') {
      target = await Discussion.findById(targetId);
    } else {
      target = await DiscussionReply.findById(targetId);
    }

    if (!target) return res.status(404).json({ error: `${targetModel} not found` });

    const existingReport = await Report.findOne({
      reporter: req.user.id,
      targetModel,
      targetId
    });

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this content' });
    }

    const report = new Report({
      reporter: req.user.id,
      targetModel,
      targetId,
      reason
    });

    await report.save();
    
    // Mark target as reported for quick filtering by admins
    target.reported = true;
    await target.save();

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
