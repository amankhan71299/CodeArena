import Problem from '../models/Problem.js';

export const getPublishedProblems = async (req, res) => {
  try {
    const { difficulty, search, topic } = req.query;
    
    // Base query: Only return problems that are not archived
    const query = { archived: false };
    
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (topic) {
      query.topics = topic;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Do not return testCases in the list view at all to save bandwidth
    const problems = await Problem.find(query)
      .select('-testCases')
      .sort({ createdAt: -1 });
      
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
};

export const getProblemBySlug = async (req, res) => {
  try {
    const problem = await Problem.findOne({ slug: req.params.slug, archived: false }).lean();
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // EXPLICIT SECURITY REQUIREMENT:
    // Strip hidden test cases completely before sending to student
    if (problem.testCases && Array.isArray(problem.testCases)) {
      problem.testCases = problem.testCases.filter(tc => tc.hidden === false);
    }
    
    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
};
