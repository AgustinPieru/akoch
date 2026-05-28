import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me, refresh } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Password requerido'),
  ],
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
