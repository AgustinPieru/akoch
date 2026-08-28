import { Resend } from 'resend';
import { MessageMedia } from 'whatsapp-web.js';
import { getClient } from './whatsapp.client';
import { generateReceiptBuffer } from '../payments/receipt.service';
import { generateSettlementBuffer } from '../settlements/settlement-pdf.service';
import { generateContractSummaryBuffer, getContractEmailAttachments } from '../contracts/contract-pdf.service';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw { status: 500, message: 'RESEND_API_KEY no configurada', code: 'CONFIG_ERROR' };
  return new Resend(key);
}

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? 'Inmobiliaria <onboarding@resend.dev>';
}

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

function normalizeDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('549') ? digits : `549${digits}`;
}

async function resolveWaChatId(wa: import('whatsapp-web.js').Client, phone: string): Promise<string> {
  const digits = normalizeDigits(phone);
  // getNumberId resuelve el WID correcto (incluyendo LID en el protocolo multi-device)
  const numberId = await wa.getNumberId(digits);
  if (!numberId) throw { status: 422, message: `El número ${digits} no está registrado en WhatsApp`, code: 'WA_NOT_REGISTERED' };
  return numberId._serialized;
}

export async function sendWhatsAppText(phone: string, message: string): Promise<void> {
  const wa = getClient();
  if (!wa) {
    console.warn(`[WA] Cliente no conectado, omitiendo mensaje a ${phone}`);
    return;
  }
  const chatId = await resolveWaChatId(wa, phone);
  await wa.sendMessage(chatId, message);
}

// ─── WhatsApp — recibo PDF ────────────────────────────────────────────────────

export async function sendReceiptViaWhatsApp(paymentId: number, phone: string) {
  const wa = getClient();
  if (!wa) throw { status: 503, message: 'WhatsApp no está conectado', code: 'WA_NOT_READY' };

  const [{ buffer, filename, period }, chatId] = await Promise.all([
    generateReceiptBuffer(paymentId),
    resolveWaChatId(wa, phone),
  ]);

  const media = new MessageMedia('application/pdf', buffer.toString('base64'), filename);
  await wa.sendMessage(chatId, media, { caption: `Recibo de alquiler — ${period}` });

  return { sent: true, phone: phone.replace(/\D/g, ''), period };
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendReceiptViaEmail(paymentId: number, email: string) {
  const resend = getResend();
  const { buffer, filename, period } = await generateReceiptBuffer(paymentId);

  const result = await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: `Recibo de alquiler — ${period}`,
    html: `
      <p>Hola,</p>
      <p>Adjuntamos el recibo de alquiler correspondiente al período <strong>${period}</strong>.</p>
      <p>Ante cualquier consulta no dudes en contactarnos.</p>
      <br/>
      <p style="color:#888;font-size:12px">Este mensaje fue generado automáticamente.</p>
    `,
    attachments: [{ filename, content: buffer }],
  });

  if (result.error) throw { status: 500, message: result.error.message, code: 'EMAIL_ERROR' };
  return { sent: true, email, period, messageId: result.data?.id };
}

// ─── Settlement ───────────────────────────────────────────────────────────────

export async function sendSettlementViaWhatsApp(settlementId: number, phone: string) {
  const wa = getClient();
  if (!wa) throw { status: 503, message: 'WhatsApp no está conectado', code: 'WA_NOT_READY' };

  const [{ buffer, filename, period }, chatId] = await Promise.all([
    generateSettlementBuffer(settlementId),
    resolveWaChatId(wa, phone),
  ]);

  const media = new MessageMedia('application/pdf', buffer.toString('base64'), filename);
  await wa.sendMessage(chatId, media, { caption: `Liquidación de alquiler — ${period}` });

  return { sent: true, phone: phone.replace(/\D/g, ''), period };
}

export async function sendSettlementViaEmail(settlementId: number, email: string) {
  const resend = getResend();
  const { buffer, filename, period } = await generateSettlementBuffer(settlementId);

  const result = await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: `Liquidación de alquiler — ${period}`,
    html: `
      <p>Hola,</p>
      <p>Adjuntamos la liquidación de alquiler correspondiente al período <strong>${period}</strong>.</p>
      <p>Ante cualquier consulta no dudes en contactarnos.</p>
      <br/>
      <p style="color:#888;font-size:12px">Este mensaje fue generado automáticamente.</p>
    `,
    attachments: [{ filename, content: buffer }],
  });

  if (result.error) throw { status: 500, message: result.error.message, code: 'EMAIL_ERROR' };
  return { sent: true, email, period, messageId: result.data?.id };
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

export async function sendContractViaEmail(contractId: number, emails: string[]) {
  const resend = getResend();
  const [{ buffer, filename, propertyLabel }, { attachments: extraAttachments, skipped }] = await Promise.all([
    generateContractSummaryBuffer(contractId),
    getContractEmailAttachments(contractId),
  ]);

  const result = await resend.emails.send({
    from: fromAddress(),
    to: emails,
    subject: `Contrato de alquiler — ${propertyLabel}`,
    html: `
      <p>Hola,</p>
      <p>Adjuntamos el resumen del contrato de alquiler de <strong>${propertyLabel}</strong>${extraAttachments.length ? ', junto con fotos/videos de la propiedad y documentación asociada' : ''}.</p>
      <p>Ante cualquier consulta no dudes en contactarnos.</p>
      <br/>
      <p style="color:#888;font-size:12px">Este mensaje fue generado automáticamente.</p>
    `,
    attachments: [{ filename, content: buffer }, ...extraAttachments],
  });

  if (result.error) throw { status: 500, message: result.error.message, code: 'EMAIL_ERROR' };
  return { sent: true, emails, propertyLabel, messageId: result.data?.id, skipped };
}
