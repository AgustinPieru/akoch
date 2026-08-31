import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { sendWhatsAppText } from './notification.service';
import { getSettings } from '../settings/settings.service';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function tenantName(t: { type: string; firstName?: string | null; lastName?: string | null; businessName?: string | null }) {
  return t.type === 'PERSONA_JURIDICA'
    ? (t.businessName ?? 'Inquilino')
    : [t.firstName, t.lastName].filter(Boolean).join(' ') || 'Inquilino';
}

function ownerName(o: { type: string; firstName?: string | null; lastName?: string | null; businessName?: string | null }) {
  return o.type === 'PERSONA_JURIDICA'
    ? (o.businessName ?? 'Propietario')
    : [o.firstName, o.lastName].filter(Boolean).join(' ') || 'Propietario';
}

async function trySendWA(phone: string | null | undefined, message: string, label: string) {
  if (!phone) {
    console.warn(`[automation] Sin teléfono para ${label}, omitiendo WA`);
    return;
  }
  try {
    await sendWhatsAppText(phone, message);
    console.log(`[automation] WA enviado a ${label} (${phone})`);
  } catch (err: any) {
    console.error(`[automation] Error WA a ${label}: ${err.message}`);
  }
}

// ─── 1. Marcar pagos vencidos como LATE + WA recordatorio ─────────────────────

export async function runMarkLatePayments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingLate = await prisma.payment.findMany({
    where: { status: 'PENDING', dueDate: { lt: today } },
    include: {
      contract: {
        select: {
          currency: true,
          adminCommissionPct: true,
          property: { select: { street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
            take: 1,
          },
        },
      },
    },
  });

  if (pendingLate.length === 0) return { marked: 0, notified: 0 };

  // Marcar todos como LATE en batch
  await prisma.payment.updateMany({
    where: { id: { in: pendingLate.map((p) => p.id) } },
    data: { status: 'LATE' },
  });

  let notified = 0;
  const bnaRate = env.BNA_INTEREST_RATE;

  const settings = await getSettings();
  if (!settings.lateNotificationsEnabled) {
    console.log('[runMarkLatePayments] Notificaciones de mora pausadas en Configuración — se omiten los WA.');
    return { marked: pendingLate.length, notified: 0, skipped: true };
  }

  for (const payment of pendingLate) {
    const tenant = payment.contract.tenants[0]?.tenant;
    if (!tenant?.phone) continue;

    const dueDate = new Date(payment.dueDate);
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
    const capital = Number(payment.expectedAmount);
    const interest = capital * (bnaRate / 365) * daysLate;
    const total = capital + interest;
    const { street, number, city } = payment.contract.property;

    const msg =
      `⚠️ *Recordatorio de alquiler vencido*\n\n` +
      `Hola ${tenantName(tenant)},\n` +
      `Tu alquiler de *${street} ${number}, ${city}* está vencido hace *${daysLate} día${daysLate !== 1 ? 's' : ''}*.\n\n` +
      `• Alquiler: ${fmt(capital, payment.contract.currency)}\n` +
      `• Intereses (${(bnaRate * 100).toFixed(0)}% anual): ${fmt(interest, payment.contract.currency)}\n` +
      `• *Total a pagar: ${fmt(total, payment.contract.currency)}*\n\n` +
      `Por favor regularizá tu situación a la brevedad. Ante consultas, comunicate con la inmobiliaria.`;

    await trySendWA(tenant.phone, msg, tenantName(tenant));
    notified++;
  }

  console.log(`[runMarkLatePayments] ${pendingLate.length} marcados LATE, ${notified} WA enviados`);
  return { marked: pendingLate.length, notified };
}

// ─── 2. Alertas de contratos por vencer ───────────────────────────────────────

const EXPIRY_THRESHOLDS = [60, 30, 15];

export async function runContractExpiryAlerts() {
  const settings = await getSettings();
  if (!settings.expiryNotificationsEnabled) {
    console.log('[runContractExpiryAlerts] Notificaciones de vencimiento pausadas en Configuración — se omiten.');
    return { totalAlerts: 0, skipped: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalAlerts = 0;

  for (const days of EXPIRY_THRESHOLDS) {
    const targetStart = new Date(today);
    targetStart.setDate(targetStart.getDate() + days);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);

    const contracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: targetStart, lt: targetEnd },
      },
      include: {
        property: {
          select: {
            street: true, number: true, city: true,
            owners: {
              include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
            },
          },
        },
        tenants: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
          take: 1,
        },
      },
    });

    for (const contract of contracts) {
      const { street, number, city } = contract.property;
      const tenant = contract.tenants[0]?.tenant;
      const endDateStr = new Date(contract.endDate).toLocaleDateString('es-AR');

      // WA al admin
      if (env.ADMIN_WHATSAPP_PHONE) {
        const adminMsg =
          `🔔 *Contrato por vencer — ${days} días*\n\n` +
          `Propiedad: *${street} ${number}, ${city}*\n` +
          `Inquilino: ${tenant ? tenantName(tenant) : '—'}\n` +
          `Vencimiento: *${endDateStr}*\n\n` +
          `Recordá gestionar la renovación o comunicarte con las partes.`;
        await trySendWA(env.ADMIN_WHATSAPP_PHONE, adminMsg, `admin (contrato ${contract.id})`);
        totalAlerts++;
      }

      // WA al inquilino (solo en 30 y 15 días para no saturar)
      if (days <= 30 && tenant?.phone) {
        const tenantMsg =
          `📋 *Aviso de vencimiento de contrato*\n\n` +
          `Hola ${tenantName(tenant)},\n` +
          `Tu contrato de alquiler en *${street} ${number}, ${city}* vence el *${endDateStr}* (en ${days} días).\n\n` +
          `La inmobiliaria se pondrá en contacto con vos para coordinar la renovación o el proceso de egreso.`;
        await trySendWA(tenant.phone, tenantMsg, `inquilino (contrato ${contract.id})`);
        totalAlerts++;
      }

      // WA al propietario (solo en 30 y 15 días)
      if (days <= 30) {
        const propertyOwner = contract.property.owners[0]?.owner;
        if (propertyOwner?.phone) {
          const ownerMsg =
            `📋 *Aviso de vencimiento de contrato*\n\n` +
            `Hola ${ownerName(propertyOwner)},\n` +
            `El contrato de alquiler de tu propiedad en *${street} ${number}, ${city}* vence el *${endDateStr}* (en ${days} días).\n\n` +
            `Nos comunicaremos con vos para coordinar los pasos a seguir.`;
          await trySendWA(propertyOwner.phone, ownerMsg, `propietario (contrato ${contract.id})`);
          totalAlerts++;
        }
      }
    }

    if (contracts.length > 0) {
      console.log(`[runContractExpiryAlerts] ${contracts.length} contratos vencen en ${days} días`);
    }
  }

  console.log(`[runContractExpiryAlerts] ${totalAlerts} alertas enviadas en total`);
  return { totalAlerts };
}

// ─── 3. Notificaciones mensuales (1° de cada mes) ─────────────────────────────

export async function runMonthlyPaymentNotifications() {
  const settings = await getSettings();
  if (!settings.monthlyNotificationsEnabled) {
    console.log('[runMonthlyPaymentNotifications] Notificaciones mensuales pausadas en Configuración — se omiten.');
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear(), tenantNotified: 0, ownerNotified: 0, paymentsProcessed: 0, skipped: true };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  const payments = await prisma.payment.findMany({
    where: { periodYear: year, periodMonth: month, status: 'PENDING' },
    include: {
      contract: {
        select: {
          currency: true,
          adminCommissionPct: true,
          property: {
            select: {
              street: true, number: true, city: true,
              owners: {
                include: { owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
              },
            },
          },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
            take: 1,
          },
        },
      },
    },
  });

  let tenantNotified = 0;
  // Map owner id → list of { property, expectedAmount, currency, commissionPct }
  const ownerMap = new Map<number, {
    owner: { id: number; firstName?: string | null; lastName?: string | null; businessName?: string | null; type: string; phone?: string | null };
    items: { property: string; expectedAmount: number; currency: string; commissionPct: number }[];
  }>();

  for (const payment of payments) {
    const { contract } = payment;
    const tenant = contract.tenants[0]?.tenant;
    const { street, number, city } = contract.property;
    const propertyLabel = `${street} ${number}, ${city}`;
    const dueStr = new Date(payment.dueDate).toLocaleDateString('es-AR');

    // WA al inquilino
    if (tenant?.phone) {
      const msg =
        `📅 *Recordatorio de alquiler — ${monthLabel}*\n\n` +
        `Hola ${tenantName(tenant)},\n` +
        `Te recordamos que el alquiler de *${propertyLabel}* para el mes de *${monthLabel}* es de:\n\n` +
        `💰 *${fmt(Number(payment.expectedAmount), contract.currency)}*\n\n` +
        `Fecha de vencimiento: *${dueStr}*\n\n` +
        `Ante cualquier consulta, comunicate con la inmobiliaria.`;
      await trySendWA(tenant.phone, msg, tenantName(tenant));
      tenantNotified++;
    }

    // Acumular para propietario
    for (const po of contract.property.owners) {
      const o = po.owner;
      if (!ownerMap.has(o.id)) {
        ownerMap.set(o.id, { owner: o, items: [] });
      }
      ownerMap.get(o.id)!.items.push({
        property: propertyLabel,
        expectedAmount: Number(payment.expectedAmount),
        currency: contract.currency,
        commissionPct: contract.adminCommissionPct,
      });
    }
  }

  // WA a cada propietario con resumen del mes
  let ownerNotified = 0;
  for (const { owner, items } of ownerMap.values()) {
    if (!owner.phone) continue;

    const lines = items.map((item) => {
      const net = item.expectedAmount * (1 - item.commissionPct / 100);
      return `• ${item.property}: ${fmt(item.expectedAmount, item.currency)} → neto ~${fmt(net, item.currency)}`;
    });

    const msg =
      `📊 *Resumen de cobros — ${monthLabel}*\n\n` +
      `Hola ${ownerName(owner)},\n` +
      `Este es el resumen de alquileres a cobrar este mes:\n\n` +
      lines.join('\n') +
      `\n\nEn cuanto se confirmen los cobros, generaremos tu liquidación. Cualquier consulta, estamos a disposición.`;

    await trySendWA(owner.phone, msg, ownerName(owner));
    ownerNotified++;
  }

  console.log(`[runMonthlyPaymentNotifications] ${monthLabel}: ${tenantNotified} inquilinos, ${ownerNotified} propietarios notificados`);
  return { month, year, tenantNotified, ownerNotified, paymentsProcessed: payments.length };
}
