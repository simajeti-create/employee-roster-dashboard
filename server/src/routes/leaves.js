import { Router } from 'express';
import * as leaveController from '../controllers/leaveController.js';

const router = Router();

router.post('/import', leaveController.importLeaves);
router.get('/', leaveController.list);
router.get('/:id', leaveController.get);
router.post('/', leaveController.create);
router.put('/:id', leaveController.update);
router.delete('/:id', leaveController.remove);

export default router;
