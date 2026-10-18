import { Router } from 'express';
import * as shiftController from '../controllers/shiftController.js';
import * as breakController from '../controllers/breakController.js';

const router = Router();

router.post('/apply-defaults', shiftController.applyDefaults);
router.post('/bulk', shiftController.bulkSet);
router.get('/', shiftController.list);
router.get('/:id', shiftController.get);
router.post('/', shiftController.create);
router.put('/:id', shiftController.update);
router.delete('/:id', shiftController.remove);

router.get('/:shiftId/breaks', breakController.listForShift);

export default router;
