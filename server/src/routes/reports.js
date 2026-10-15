import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';

const router = Router();

router.get('/weekly', reportController.weekly);
router.get('/nsa', reportController.nsa);

export default router;
