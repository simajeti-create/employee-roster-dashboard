import { Router } from 'express';
import * as activeController from '../controllers/activeController.js';

const router = Router();

router.get('/', activeController.get);

export default router;
