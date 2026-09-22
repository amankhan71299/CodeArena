import { Router } from 'express';
import { getPublishedProblems, getProblemBySlug } from '../controllers/student.problem.controller.js';

const router = Router();

router.get('/', getPublishedProblems);
router.get('/:slug', getProblemBySlug);

export default router;
