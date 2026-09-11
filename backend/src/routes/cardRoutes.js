import { Router } from 'express';
import { createCardController } from '../controllers/cardController.js';

export function createCardRoutes(deckService) {
  return Router().get('/', createCardController(deckService));
}
