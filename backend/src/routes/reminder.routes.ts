import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { listReminders, createReminder, deleteReminder } from '../controllers/reminder.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', listReminders);
router.post('/', createReminder);
router.delete('/:id', deleteReminder);

export default router;
