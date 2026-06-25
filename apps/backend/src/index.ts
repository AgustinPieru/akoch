import './config/env';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { env } from './config/env';
import prisma from './lib/prisma';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { runAutoAdjustments } from './modules/contracts/auto-adjust.service';
import { runAutoExpire } from './modules/contracts/auto-expire.service';
import { runMarkLatePayments, runContractExpiryAlerts, runMonthlyPaymentNotifications } from './modules/notifications/automation.service';
import { initWhatsApp } from './modules/notifications/whatsapp.client';
import authRoutes from './modules/auth/auth.routes';
import ownersRoutes from './modules/owners/owners.routes';
import propertiesRoutes from './modules/properties/properties.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import tenantsRoutes from './modules/tenants/tenants.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import guarantorsRoutes from './modules/guarantors/guarantors.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import settlementsRoutes from './modules/settlements/settlements.routes';
import salesRoutes from './modules/sales/sales.routes';
import reportsRoutes from './modules/reports/reports.routes';
import documentsRoutes from './modules/documents/documents.routes';
import informalOccupationsRoutes from './modules/informal-occupations/informal-occupations.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import { getSettings } from './modules/settings/settings.service';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV === 'production') {
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Inmobiliaria API' });
});

// Trigger manual de ajuste automático (para testing o corrección)
app.post('/api/v1/contracts/run-adjustments', async (_req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.autoAdjustEnabled) {
      res.status(409).json({ error: 'El ajuste automático está pausado en Configuración', code: 'AUTO_ADJUST_PAUSED' });
      return;
    }
    const result = await runAutoAdjustments();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'AUTO_ADJUST_ERROR' });
  }
});

// Trigger manual de expiración de contratos
app.post('/api/v1/contracts/run-expire', async (_req, res) => {
  try {
    const result = await runAutoExpire();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'AUTO_EXPIRE_ERROR' });
  }
});

// Trigger manual: marcar pagos vencidos como LATE + WA
app.post('/api/v1/automation/run-late-payments', async (_req, res) => {
  try {
    const result = await runMarkLatePayments();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'LATE_PAYMENTS_ERROR' });
  }
});

// Trigger manual: alertas de contratos por vencer
app.post('/api/v1/automation/run-expiry-alerts', async (_req, res) => {
  try {
    const result = await runContractExpiryAlerts();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'EXPIRY_ALERTS_ERROR' });
  }
});

// Trigger manual: notificaciones mensuales a inquilinos y propietarios
app.post('/api/v1/automation/run-monthly-notifications', async (_req, res) => {
  try {
    const result = await runMonthlyPaymentNotifications();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'MONTHLY_NOTIF_ERROR' });
  }
});

// Rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/owners', ownersRoutes);
app.use('/api/v1/properties', propertiesRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/tenants', tenantsRoutes);
app.use('/api/v1/contracts', contractsRoutes);
app.use('/api/v1/guarantors', guarantorsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/settlements', settlementsRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/ocupaciones', informalOccupationsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = async () => {
  console.log('Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Cron: ajuste automático de índices todos los días a las 8:00 AM (hora Argentina)
cron.schedule(
  '0 8 * * *',
  async () => {
    const settings = await getSettings();
    if (!settings.autoAdjustEnabled) {
      console.log('[cron] Ajuste automático pausado en Configuración — se omite.');
      return;
    }
    console.log('[cron] Iniciando ajuste automático de contratos...');
    await runAutoAdjustments();
  },
  { timezone: 'America/Argentina/Buenos_Aires' },
);

// Cron: expiración automática de contratos todos los días a las 0:05 AM (hora Argentina)
cron.schedule(
  '5 0 * * *',
  async () => {
    console.log('[cron] Verificando contratos vencidos...');
    const result = await runAutoExpire();
    if (result.expired > 0) {
      console.log(`[cron] ${result.expired} contrato(s) marcado(s) como EXPIRED`);
    }
  },
  { timezone: 'America/Argentina/Buenos_Aires' },
);

// Cron: marcar pagos vencidos como LATE + WA recordatorio — todos los días a las 00:30
cron.schedule(
  '30 0 * * *',
  async () => {
    console.log('[cron] Marcando pagos vencidos como LATE...');
    const result = await runMarkLatePayments();
    console.log(`[cron] LATE: ${result.marked} marcados, ${result.notified} WA enviados`);
  },
  { timezone: 'America/Argentina/Buenos_Aires' },
);

// Cron: alertas de contratos por vencer (60/30/15 días) — todos los días a las 09:00
cron.schedule(
  '0 9 * * *',
  async () => {
    console.log('[cron] Enviando alertas de contratos por vencer...');
    const result = await runContractExpiryAlerts();
    console.log(`[cron] Expiry alerts: ${result.totalAlerts} enviadas`);
  },
  { timezone: 'America/Argentina/Buenos_Aires' },
);

// Cron: notificaciones mensuales a inquilinos y propietarios — día 1 de cada mes a las 07:00
cron.schedule(
  '0 7 1 * *',
  async () => {
    console.log('[cron] Enviando notificaciones mensuales...');
    const result = await runMonthlyPaymentNotifications();
    console.log(`[cron] Monthly: ${result.tenantNotified} inquilinos, ${result.ownerNotified} propietarios`);
  },
  { timezone: 'America/Argentina/Buenos_Aires' },
);

app.listen(env.PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
  console.log(`Health: http://localhost:${env.PORT}/api/health`);
  console.log('[cron] Ajuste automático:        08:00 diario');
  console.log('[cron] Expiración contratos:      00:05 diario');
  console.log('[cron] Marcar LATE + WA mora:     00:30 diario');
  console.log('[cron] Alertas vencimientos:      09:00 diario');
  console.log('[cron] Notificaciones mensuales:  07:00 día 1 de cada mes');

  // Inicializar WhatsApp automáticamente 5 segundos después de arrancar
  // para no bloquear el startup y dar tiempo a que la DB conecte
  setTimeout(() => {
    console.log('[whatsapp] Auto-inicializando cliente...');
    initWhatsApp();
  }, 5000);
});

export default app;
