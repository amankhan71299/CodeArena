import Contest from '../models/Contest.js';
import ContestParticipant from '../models/ContestParticipant.js';

export const getPublishedContests = async (req, res) => {
  try {
    const contests = await Contest.find({ published: true, archived: false })
      .select('-problems') // Exclude problems list from list view
      .sort({ startTime: -1 });
    res.json(contests);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching contests' });
  }
};

export const getContestBySlug = async (req, res) => {
  try {
    const contest = await Contest.findOne({ slug: req.params.slug, published: true, archived: false })
      .populate({
        path: 'problems.problem',
        select: 'title slug difficulty topics timeLimit memoryLimit supportedLanguages functionSignature' // Exclude testCases entirely to prevent leaks
      });

    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching contest details' });
  }
};

export const joinContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest || !contest.published || contest.archived) {
      return res.status(404).json({ error: 'Contest not found or unavailable' });
    }

    const existing = await ContestParticipant.findOne({ contest: contest._id, user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'Already registered for this contest' });
    }

    const participant = new ContestParticipant({
      contest: contest._id,
      user: req.user.id
    });
    
    await participant.save();
    res.status(201).json(participant);
  } catch (error) {
    res.status(500).json({ error: 'Server error joining contest' });
  }
};

export const getParticipant = async (req, res) => {
  try {
    const participant = await ContestParticipant.findOne({ contest: req.params.id, user: req.user.id });
    if (!participant) return res.status(404).json({ error: 'Not registered' });
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching participant' });
  }
};

export const getContestRanking = async (req, res) => {
  try {
    const participants = await ContestParticipant.find({ contest: req.params.id })
      .populate('user', 'username')
      .sort({ solvedCount: -1, penalty: 1, wrongSubmissionCount: 1, updatedAt: 1, _id: 1 })
      .limit(100); // Limit to top 100 for Phase 7

    const ranking = participants.map((p, index) => ({
      rank: index + 1,
      username: p.user ? p.user.username : 'Unknown',
      solvedCount: p.solvedCount,
      score: p.score,
      penalty: p.penalty,
      wrongSubmissionCount: p.wrongSubmissionCount || 0
    }));

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching ranking' });
  }
};
