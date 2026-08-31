import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

const SESSION_ROOT = path.join(process.cwd(), '.whatsapp-session');
const SESSION_PATH = path.join(SESSION_ROOT, 'session');

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

// El navegador puede quedar colgado si la sesión está corrupta; destroy() no puede
// bloquear indefinidamente un reset o disconnect manual.
async function destroyClientSafe(timeoutMs = 5000) {
  if (!client) return;
  const current = client;
  client = null;
  await Promise.race([
    current.destroy().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export async function disconnectWhatsApp() {
  await destroyClientSafe();
  status = 'disconnected';
  qrDataUrl = null;
  loadingPercent = 0;
  loadingMessage = '';
  broadcastStatus();
  console.log('[whatsapp] Cliente desconectado manualmente');
}

// Borra la sesión persistida en disco y arranca de cero para forzar un QR nuevo.
// Útil cuando la conexión queda trabada (sesión corrupta, Chromium colgado, etc.).
export async function resetWhatsAppSession() {
  await destroyClientSafe();
  status = 'disconnected';
  qrDataUrl = null;
  loadingPercent = 0;
  loadingMessage = '';
  broadcastStatus();

  try {
    fs.rmSync(SESSION_ROOT, { recursive: true, force: true });
    console.log('[whatsapp] Sesión eliminada de disco');
  } catch (err: any) {
    console.error('[whatsapp] Error al eliminar sesión de disco:', err?.message || err);
  }

  initWhatsApp();
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

  client.initialize().catch((err) => {
    console.error('[whatsapp] Error al inicializar cliente:', err?.message || err);
    status = 'disconnected';
    loadingPercent = 0;
    loadingMessage = '';
    qrDataUrl = null;
    client = null;
    broadcastStatus();
  });
  console.log('[whatsapp] Inicializando cliente...');
}
