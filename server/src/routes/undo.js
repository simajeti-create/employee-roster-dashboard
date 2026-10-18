import { Router } from 'express';
import * as undoController from '../controllers/undoController.js';

const router = Router();

router.get('/', undoController.status);
router.post('/', undoController.undo);

export default router;
