import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { getReports, resolveReport, getReportedContent } from '../controllers/admin.moderation.controller.js';

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/', getReports);
router.get('/content', getReportedContent);
router.put('/:id/resolve', resolveReport);

export default router;
