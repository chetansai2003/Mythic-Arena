import { Router } from 'express';
import { createDeckController } from '../controllers/deckController.js';

export function createDeckRoutes({ deckService, cookies, requireAuth }) {
  const router = Router();
  const controller = createDeckController(deckService);
  router.use(requireAuth);
  router.get('/', controller.list);
  router.post('/', cookies.requireCsrf, controller.create);
  router.patch('/:id', cookies.requireCsrf, controller.update);
  router.delete('/:id', cookies.requireCsrf, controller.remove);
  return router;
}
