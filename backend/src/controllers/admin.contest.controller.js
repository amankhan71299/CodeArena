import Contest from '../models/Contest.js';
import Problem from '../models/Problem.js';
import ContestParticipant from '../models/ContestParticipant.js';
import User from '../models/User.js';
import { connection as pubClient } from '../config/redis.js';

export const getContests = async (req, res) => {
  try {
    const contests = await Contest.find().sort({ createdAt: -1 });
    res.json(contests);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching contests' });
  }
};

export const getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).populate('problems.problem', 'title slug difficulty');
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching contest' });
  }
};

export const createContest = async (req, res) => {
  try {
    const { title, slug, description, startTime, endTime, duration } = req.body;
    
    if (!title || !slug || !description || !startTime || !endTime || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const existing = await Contest.findOne({ slug });
    if (existing) {
      return res.status(400).json({ error: 'Contest slug already in use' });
    }

    const contest = new Contest({
      title, slug, description, startTime, endTime, duration, createdBy: req.user.id
    });
    await contest.save();
    res.status(201).json(contest);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error creating contest' });
  }
};

export const updateContest = async (req, res) => {
  try {
    const { title, description, startTime, endTime, duration } = req.body;
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    
    if (title) contest.title = title;
    if (description) contest.description = description;
    if (startTime) contest.startTime = startTime;
    if (endTime) contest.endTime = endTime;
    if (duration) contest.duration = duration;
    
    await contest.save();
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error updating contest' });
  }
};

export const publishContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    
    contest.published = true;
    await contest.save();
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error publishing contest' });
  }
};

export const archiveContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    
    contest.archived = true;
    await contest.save();
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error archiving contest' });
  }
};

export const addProblemToContest = async (req, res) => {
  try {
    const { problemId, order, points } = req.body;
    
    if (!problemId || order === undefined || points === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived || !problem.published) { // Note: Phase 2 didn't strictly use published for problem, we check archived
      if (!problem || problem.archived) {
        return res.status(400).json({ error: 'Problem is invalid or archived' });
      }
    }
    
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    
    // Prevent duplicates
    if (contest.problems.some(p => p.problem.toString() === problemId)) {
      return res.status(400).json({ error: 'Problem already exists in contest' });
    }
    
    contest.problems.push({ problem: problemId, order, points });
    contest.problems.sort((a, b) => a.order - b.order);
    
    await contest.save();
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error adding problem to contest' });
  }
};

export const removeProblemFromContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    
    contest.problems = contest.problems.filter(p => p.problem.toString() !== req.params.problemId);
    
    await contest.save();
    res.json(contest);
  } catch (error) {
    res.status(500).json({ error: 'Server error removing problem from contest' });
  }
};

export const finalizeContest = async (req, res) => {
  try {
    // Atomically check and lock the contest to prevent concurrent finalization exploits
    const contest = await Contest.findOneAndUpdate(
      { _id: req.params.id, isFinalized: { $ne: true } },
      { $set: { isFinalized: true } },
      { new: true }
    );

    if (!contest) {
      const exists = await Contest.findById(req.params.id);
      if (!exists) return res.status(404).json({ error: 'Contest not found' });
      return res.status(400).json({ error: 'Contest is already finalized or currently being processed' });
    }

    // Rank participants
    // 1. solvedCount DESC
    // 2. penalty ASC
    // 3. wrongSubmissionCount ASC
    // 4. updatedAt ASC (last active time)
    // 5. _id ASC (deterministic tiebreaker)
    const participants = await ContestParticipant.find({ contest: contest._id })
      .sort({
        solvedCount: -1,
        penalty: 1,
        wrongSubmissionCount: 1,
        updatedAt: 1,
        _id: 1
      });

    let currentRank = 1;
    for (const participant of participants) {
      if (participant.rewardProcessed) continue;

      let placementReward = 0;
      if (participant.solvedCount > 0) {
        if (currentRank === 1) placementReward = 100;
        else if (currentRank === 2) placementReward = 70;
        else if (currentRank === 3) placementReward = 50;
        else placementReward = 30;
      }

      const finalContestReward = placementReward - (participant.wrongSubmissionCount * 5);

      await User.findByIdAndUpdate(
        participant.user,
        { $inc: { globalScore: finalContestReward } }
      );

      participant.rewardProcessed = true;
      await participant.save();

      // Only increment rank if they actually solved something and were counted for a placement
      if (participant.solvedCount > 0) {
        currentRank++;
      }
    }

    // Invalidate global leaderboard cache
    await pubClient.del('global_leaderboard').catch(err => console.error('Failed to invalidate cache:', err));

    res.json({ message: 'Contest finalized and rewards distributed successfully', contest });
  } catch (error) {
    console.error('Failed to finalize contest:', error);
    // If a severe failure happens, we might want to manually revert isFinalized 
    // but the participant `rewardProcessed` lock guarantees partial runs are safe to retry 
    // if an admin manually flips isFinalized back to false.
    res.status(500).json({ error: 'Server error finalizing contest' });
  }
};
