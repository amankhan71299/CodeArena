import slugify from 'slugify';
import mongoose from 'mongoose';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import Submission from '../models/Submission.js';
import Discussion from '../models/Discussion.js';
import DiscussionReply from '../models/DiscussionReply.js';

export const getProblems = async (req, res) => {
  try {
    // Admin can see all problems, including archived ones
    const problems = await Problem.find().sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    // Admin gets all data, including hidden test cases
    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
};

export const createProblem = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    
    // Ensure slug uniqueness
    let existingProblem = await Problem.findOne({ slug });
    let counter = 1;
    while (existingProblem) {
      slug = `${baseSlug}-${counter}`;
      existingProblem = await Problem.findOne({ slug });
      counter++;
    }

    const problemData = { ...req.body, slug };
    const problem = new Problem(problemData);
    
    // Let mongoose validate everything
    await problem.validate();
    await problem.save();

    res.status(201).json(problem);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create problem' });
  }
};

export const updateProblem = async (req, res) => {
  try {
    // Prevent overriding the original slug during an update unless explicitly requested.
    // Usually, we don't want to change the slug as it breaks existing links.
    const { slug, ...updateData } = req.body;
    
    const problem = await Problem.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json(problem);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to update problem' });
  }
};

export const deleteProblem = async (req, res) => {
  try {
    // Soft delete: Archive instead of permanent deletion
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json({ message: 'Problem archived successfully', problem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive problem' });
  }
};

export const permanentlyDeleteProblem = async (req, res) => {
  try {
    const problemId = req.params.id;

    // Check if referenced by any contest
    const contest = await Contest.findOne({ 'problems.problem': problemId });
    if (contest) {
      return res.status(400).json({ error: 'This problem is currently used in a contest and cannot be removed.' });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Find and delete associated discussions and replies
    const discussions = await Discussion.find({ problem: problemId });
    const discussionIds = discussions.map(d => d._id);
    
    if (discussionIds.length > 0) {
      const replies = await DiscussionReply.find({ discussion: { $in: discussionIds } });
      const replyIds = replies.map(r => r._id);
      
      // Delete Reports against these replies
      if (replyIds.length > 0) {
        await mongoose.model('Report').deleteMany({ targetModel: 'DiscussionReply', targetId: { $in: replyIds } });
      }
      
      // Delete Reports against the discussions
      await mongoose.model('Report').deleteMany({ targetModel: 'Discussion', targetId: { $in: discussionIds } });
      
      // Delete replies and discussions
      await DiscussionReply.deleteMany({ discussion: { $in: discussionIds } });
      await Discussion.deleteMany({ problem: problemId });
    }
    
    // Delete Submissions
    await Submission.deleteMany({ problem: problemId });
    
    // Delete the problem itself
    await Problem.findByIdAndDelete(problemId);

    res.json({ message: 'Problem permanently removed' });
  } catch (error) {
    console.error('Error permanently deleting problem:', error);
    res.status(500).json({ error: 'Failed to permanently delete problem' });
  }
};

export const saveEditorial = async (req, res) => {
  try {
    const { explanation, approach, algorithm, complexity, codeExplanation } = req.body;
    
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    problem.editorial = {
      explanation,
      approach,
      algorithm,
      complexity,
      codeExplanation
    };

    await problem.save();
    res.json({ message: 'Editorial saved successfully', editorial: problem.editorial });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save editorial' });
  }
};

export const deleteEditorial = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    problem.editorial = null;
    await problem.save();
    
    res.json({ message: 'Editorial deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete editorial' });
  }
};

