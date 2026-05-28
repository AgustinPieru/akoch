import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { getWhatsAppStatus, getQrDataUrl, initWhatsApp, disconnectWhatsApp, addSseClient } from './whatsapp.client';
import { sendReceiptViaWhatsApp, sendReceiptViaEmail } from './notification.service';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

const router = Router();

// SSE: fuera del middleware authenticate porque EventSource no soporta headers custom
// El token se valida via query param: /whatsapp/events?token=xxx
router.get('/whatsapp/events', (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = addSseClient(res);
  req.on('close', unsubscribe);
});

// Resto de rutas protegidas normalmente
router.use(authenticate);

// Estado y QR de WhatsApp
router.get('/whatsapp/status', (_req, res) => {
  res.json(getWhatsAppStatus());
});

router.get('/whatsapp/qr', (_req, res) => {
  const qr = getQrDataUrl();
  if (!qr) return res.status(404).json({ error: 'QR no disponible', code: 'NO_QR' });
  res.json({ qr });
});

router.post('/whatsapp/init', (_req, res) => {
  initWhatsApp();
  res.json({ message: 'Inicializando WhatsApp...' });
});

router.post('/whatsapp/disconnect', async (_req, res) => {
  await disconnectWhatsApp();
  res.json({ message: 'Desconectado' });
});

// Enviar recibo por WhatsApp
router.post(
  '/send/whatsapp',
  [
    body('paymentId').isInt().withMessage('paymentId requerido'),
    body('phone').notEmpty().withMessage('Número de teléfono requerido'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Datos inválidos', details: errors.array() });
    try {
      const result = await sendReceiptViaWhatsApp(Number(req.body.paymentId), req.body.phone);
      res.json(result);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = err.message ?? 'Error interno al enviar por WhatsApp';
      res.status(status).json({ error: message, code: err.code ?? 'INTERNAL_ERROR' });
    }
  },
);

// Enviar recibo por Email
router.post(
  '/send/email',
  [
    body('paymentId').isInt().withMessage('paymentId requerido'),
    body('email').isEmail().withMessage('Email inválido'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Datos inválidos', details: errors.array() });
    try {
      const result = await sendReceiptViaEmail(Number(req.body.paymentId), req.body.email);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },
);

export default router;
