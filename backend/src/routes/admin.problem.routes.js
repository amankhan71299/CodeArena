import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { 
  getProblems, 
  getProblemById, 
  createProblem, 
  updateProblem, 
  deleteProblem,
  permanentlyDeleteProblem,
  saveEditorial,
  deleteEditorial 
} from '../controllers/admin.problem.controller.js';

const router = Router();

// Apply middleware to all routes in this router
router.use(authenticate, authorizeAdmin);

router.get('/', getProblems);
router.post('/', createProblem);
router.get('/:id', getProblemById);
router.put('/:id', updateProblem);
router.delete('/:id', deleteProblem);
router.delete('/:id/permanent', permanentlyDeleteProblem);

// Editorial routes
router.post('/:id/editorial', saveEditorial);
router.delete('/:id/editorial', deleteEditorial);

export default router;
