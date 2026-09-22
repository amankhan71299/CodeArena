import Report from '../models/Report.js';
import Discussion from '../models/Discussion.js';
import DiscussionReply from '../models/DiscussionReply.js';

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ resolved: false })
      .populate('reporter', 'username')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { action } = req.body; // 'dismiss' or 'delete'
    const report = await Report.findById(req.params.id);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (action === 'delete') {
      if (report.targetModel === 'Discussion') {
        const discussion = await Discussion.findById(report.targetId);
        if (discussion) {
          await DiscussionReply.deleteMany({ discussion: discussion._id });
          await discussion.deleteOne();
        }
      } else if (report.targetModel === 'DiscussionReply') {
        const reply = await DiscussionReply.findById(report.targetId);
        if (reply) {
          const discussion = await Discussion.findById(reply.discussion);
          if (discussion) {
            discussion.replyCount = Math.max(0, discussion.replyCount - 1);
            await discussion.save();
          }
          await reply.deleteOne();
        }
      }
    }

    report.resolved = true;
    report.resolvedAt = new Date();
    report.resolvedBy = req.user.id;
    await report.save();

    // Optionally mark other reports for the same target as resolved
    await Report.updateMany(
      { targetModel: report.targetModel, targetId: report.targetId, resolved: false },
      { $set: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id } }
    );

    res.json({ message: 'Report resolved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

export const getReportedContent = async (req, res) => {
  try {
    const { targetModel, targetId } = req.query;
    let content;

    if (targetModel === 'Discussion') {
      content = await Discussion.findById(targetId).populate('user', 'username');
    } else {
      content = await DiscussionReply.findById(targetId).populate('user', 'username');
    }

    if (!content) return res.status(404).json({ error: 'Content not found or already deleted' });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reported content' });
  }
};
