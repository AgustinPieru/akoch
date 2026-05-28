import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

const SESSION_PATH = path.join(process.cwd(), '.whatsapp-session', 'session');

function clearSessionLocks() {
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    const lockPath = path.join(SESSION_PATH, lock);
    if (fs.existsSync(lockPath)) {
      fs.rmSync(lockPath, { force: true });
      console.log(`[whatsapp] Lock eliminado: ${lock}`);
    }
  }
}

export type WhatsAppStatus = 'disconnected' | 'initializing' | 'loading' | 'qr_pending' | 'ready';

let client: Client | null = null;
let qrDataUrl: string | null = null;
let status: WhatsAppStatus = 'disconnected';
let loadingPercent = 0;
let loadingMessage = '';

// SSE: lista de clientes suscritos al estado de WhatsApp
type SseClient = { res: import('express').Response };
const sseClients: Set<SseClient> = new Set();

export function addSseClient(res: import('express').Response) {
  const client: SseClient = { res };
  sseClients.add(client);
  // Enviar estado actual inmediatamente al conectar
  res.write(`data: ${JSON.stringify(getWhatsAppStatus())}\n\n`);
  return () => sseClients.delete(client);
}

function broadcastStatus() {
  const payload = `data: ${JSON.stringify(getWhatsAppStatus())}\n\n`;
  for (const c of sseClients) {
    try { c.res.write(payload); } catch { sseClients.delete(c); }
  }
}

export function getWhatsAppStatus() {
  return { status, hasQr: !!qrDataUrl, loadingPercent, loadingMessage };
}

export function getQrDataUrl() {
  return qrDataUrl;
}

export function getClient() {
  return client;
}

export async function disconnectWhatsApp() {
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }
  status = 'disconnected';
  qrDataUrl = null;
  loadingPercent = 0;
  loadingMessage = '';
  broadcastStatus();
  console.log('[whatsapp] Cliente desconectado manualmente');
}

export function initWhatsApp() {
  if (client) return;

  clearSessionLocks();
  status = 'initializing';
  loadingPercent = 0;
  loadingMessage = 'Iniciando navegador...';

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.whatsapp-session' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    },
  });

  client.on('qr', async (qr) => {
    status = 'qr_pending';
    loadingMessage = 'Escaneá el QR con tu celular';
    qrDataUrl = await qrcode.toDataURL(qr);
    broadcastStatus();
    console.log('[whatsapp] QR generado');
  });

  client.on('authenticated', () => {
    status = 'loading';
    loadingPercent = 0;
    loadingMessage = 'Sesión restaurada, cargando...';
    broadcastStatus();
    console.log('[whatsapp] Autenticado — cargando datos');
  });

  client.on('loading_screen', (percent, message) => {
    status = 'loading';
    loadingPercent = parseInt(String(percent), 10) || 0;
    loadingMessage = message ?? 'Cargando WhatsApp...';
    broadcastStatus();
  });

  client.on('ready', () => {
    status = 'ready';
    loadingPercent = 100;
    loadingMessage = '';
    qrDataUrl = null;
    broadcastStatus();
    console.log('[whatsapp] Cliente listo');
  });

  client.on('auth_failure', (msg) => {
    status = 'disconnected';
    loadingPercent = 0;
    loadingMessage = '';
    client = null;
    broadcastStatus();
    console.error(`[whatsapp] Error de autenticación: ${msg}`);
  });

  client.on('disconnected', (reason) => {
    status = 'disconnected';
    loadingPercent = 0;
    loadingMessage = '';
    qrDataUrl = null;
    client = null;
    broadcastStatus();
    console.log(`[whatsapp] Desconectado: ${reason}`);
  });

  client.initialize();
  console.log('[whatsapp] Inicializando cliente...');
}
