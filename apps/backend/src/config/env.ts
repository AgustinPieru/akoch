import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Inmobiliaria <onboarding@resend.dev>',
  // Tasa anual BNA para intereses por mora (decimal, ej: 0.40 = 40%)
  BNA_INTEREST_RATE: parseFloat(process.env.BNA_INTEREST_RATE || '0.40'),
  // Teléfono del admin para recibir alertas de WhatsApp (formato: 1150001234)
  ADMIN_WHATSAPP_PHONE: process.env.ADMIN_WHATSAPP_PHONE || '',
};

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET no configurado. Usar solo en desarrollo.');
}
