import { Router } from 'express';
import * as breakController from '../controllers/breakController.js';

const router = Router();

router.post('/', breakController.create);
router.put('/:id', breakController.update);
router.delete('/:id', breakController.remove);

export default router;
