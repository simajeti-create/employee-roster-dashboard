import { Router } from 'express';
import * as employeeController from '../controllers/employeeController.js';

const router = Router();

router.get('/', employeeController.list);
router.get('/:id', employeeController.get);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.remove);

export default router;
