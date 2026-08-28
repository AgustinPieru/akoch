import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PassThrough } from 'stream';
import prisma from '../../lib/prisma';
import { getAgencyProfile, drawDocumentHeader, drawDocumentFooter, AgencyProfile } from '../../lib/pdf-branding.helper';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CHARGE_CATEGORY_LABELS: Record<string, string> = {
  IMPUESTO: 'Impuesto', SERVICIO: 'Servicio', TASA: 'Tasa', OTRO: 'Otro',
};

const PAID_BY_LABELS: Record<string, string> = {
  AGENCY: 'inmobiliaria', OWNER: 'propietario', TENANT: 'inquilino', SHARED: 'compartido', N_A: '',
};

function formatMoney(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function partyName(p: { type: string; firstName?: string | null; lastName?: string | null; businessName?: string | null }) {
  return p.type === 'PERSONA_JURIDICA'
    ? (p.businessName ?? '—')
    : [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
}

async function fetchSettlementData(settlementId: number) {
  const settlement = await prisma.ownerSettlement.findUnique({
    where: { id: settlementId },
    include: {
      owner: { select: { firstName: true, lastName: true, businessName: true, type: true, cbu: true, bankName: true } },
      properties: {
        include: { property: { select: { street: true, number: true, floor: true, apartment: true, city: true, province: true } } },
      },
      charges: { orderBy: { id: 'asc' } },
    },
  });
  if (!settlement) throw { status: 404, message: 'Liquidación no encontrada', code: 'NOT_FOUND' };
  return settlement;
}

type SettlementData = Awaited<ReturnType<typeof fetchSettlementData>>;

function buildSettlementDoc(doc: InstanceType<typeof PDFDocument>, settlement: SettlementData, agency: AgencyProfile) {
  const { currency } = settlement;
  const col1 = 50;
  const lineH = 20;
  const amountX = 410;
  const amountW = 135; // borde derecho en 545 (595 - margen 50)

  drawDocumentHeader(doc, agency, 'LIQUIDACIÓN DE PROPIETARIO');

  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Período:', col1, y);
  doc.font('Helvetica').text(`${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`, col1 + 70, y);
  doc.font('Helvetica-Bold').text('N° Liquidación:', 300, y);
  doc.font('Helvetica').text(`LIQ-${String(settlement.id).padStart(6, '0')}`, 300 + 100, y);
  y += lineH;
  doc.font('Helvetica-Bold').text('Estado:', col1, y);
  const statusLabel: Record<string, string> = { DRAFT: 'Borrador', SENT: 'Enviada', PAID: 'Pagada' };
  doc.font('Helvetica').text(statusLabel[settlement.status] ?? settlement.status, col1 + 70, y);
  if (settlement.paidAt) {
    doc.font('Helvetica-Bold').text('Pagada el:', 300, y);
    doc.font('Helvetica').text(new Date(settlement.paidAt).toLocaleDateString('es-AR'), 300 + 100, y);
  }
  y += lineH * 1.5;

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIETARIO', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(partyName(settlement.owner), col1, y);
  if (settlement.owner.cbu) {
    y += lineH;
    doc.text(`CBU: ${settlement.owner.cbu}${settlement.owner.bankName ? `  —  ${settlement.owner.bankName}` : ''}`, col1, y);
  }
  y += lineH * 2;

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIEDADES', col1, y);
  y += lineH;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Propiedad', col1, y);
  doc.text('Subtotal', amountX, y, { width: amountW, align: 'right' });
  y += lineH * 0.7;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').lineWidth(0.5).stroke();
  y += 8;

  for (const sp of settlement.properties) {
    const p = sp.property;
    const address = `${p.street} ${p.number}${p.floor ? ` P${p.floor}` : ''}${p.apartment ? ` D${p.apartment}` : ''}, ${p.city}`;
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(address, col1, y, { width: 340 });
    doc.text(formatMoney(sp.subtotal, currency), amountX, y, { width: amountW, align: 'right' });
    y += lineH * 0.85;
    doc.fontSize(8.5).fillColor('#777');
    doc.text(
      `Cobrado ${formatMoney(sp.rentCollected, currency)}${sp.sharePercentage < 100 ? ` (${sp.sharePercentage}% de participación)` : ''}  —  Comisión -${formatMoney(sp.commissionAmount, currency)}${sp.expensesAmount > 0 ? `  —  Gastos -${formatMoney(sp.expensesAmount, currency)}` : ''}`,
      col1, y, { width: 495 },
    );
    y += lineH * 0.9;
  }

  if (settlement.properties.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#888').text('Sin propiedades con cobros en este período.', col1, y);
    y += lineH;
  }

  y += 6;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('RESUMEN', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text('Total cobrado', col1, y); doc.text(formatMoney(settlement.totalRent, currency), amountX, y, { width: amountW, align: 'right' });
  y += lineH;
  doc.fillColor('#c62828');
  doc.text('Comisión de administración', col1, y); doc.text(`-${formatMoney(settlement.totalCommission, currency)}`, amountX, y, { width: amountW, align: 'right' });
  y += lineH;
  if (settlement.totalExpenses > 0) {
    doc.text('Gastos pagados por la inmobiliaria', col1, y); doc.text(`-${formatMoney(settlement.totalExpenses, currency)}`, amountX, y, { width: amountW, align: 'right' });
    y += lineH;
  }
  doc.fillColor('#333');

  if (settlement.charges.length > 0) {
    y += 6;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('IMPUESTOS, SERVICIOS Y OTROS CARGOS', col1, y);
    y += lineH;
    doc.font('Helvetica').fontSize(10);
    for (const charge of settlement.charges) {
      const payerLabel = PAID_BY_LABELS[charge.paidBy] ?? '';
      const deducts = charge.paidBy !== 'OWNER';
      const label = `${CHARGE_CATEGORY_LABELS[charge.category] ?? charge.category}: ${charge.description}`
        + `${payerLabel ? ` — paga ${payerLabel}` : ''}${charge.isPaid ? ' (pagado)' : ''}`
        + `${deducts ? '' : ' — no se descuenta, a cargo del propietario'}`;
      doc.fillColor(deducts ? '#c62828' : '#888');
      doc.text(label, col1, y, { width: 340 });
      doc.text(deducts ? `-${formatMoney(charge.amount, currency)}` : formatMoney(charge.amount, currency), amountX, y, { width: amountW, align: 'right' });
      doc.fillColor('#333');
      y += lineH;
    }
  }

  y += 6;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#1A3C5E').lineWidth(1.5).stroke();
  y += 12;

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A3C5E');
  doc.text('NETO A TRANSFERIR AL PROPIETARIO:', col1, y, { width: 350 });
  doc.text(formatMoney(settlement.netAmount, currency), amountX, y, { width: amountW, align: 'right' });
  y += lineH * 1.5;

  if (settlement.notes) {
    doc.font('Helvetica').fontSize(10).fillColor('#555');
    doc.text(`Notas: ${settlement.notes}`, col1, y);
  }

  drawDocumentFooter(doc, agency, 'Este documento es una liquidación emitida por');

  doc.end();
}

export async function generateSettlementPdf(settlementId: number, res: Response) {
  const [settlement, agency] = await Promise.all([fetchSettlementData(settlementId), getAgencyProfile()]);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="liquidacion-${settlement.id}-${settlement.periodYear}-${String(settlement.periodMonth).padStart(2, '0')}.pdf"`,
  );
  doc.pipe(res);
  buildSettlementDoc(doc, settlement, agency);
}

export async function generateSettlementBuffer(settlementId: number): Promise<{ buffer: Buffer; filename: string; period: string }> {
  const [settlement, agency] = await Promise.all([fetchSettlementData(settlementId), getAgencyProfile()]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (c: Buffer) => chunks.push(c));
    passThrough.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        filename: `liquidacion-${settlement.id}-${settlement.periodYear}-${String(settlement.periodMonth).padStart(2, '0')}.pdf`,
        period: `${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`,
      });
    });
    passThrough.on('error', reject);

    doc.pipe(passThrough);
    buildSettlementDoc(doc, settlement, agency);
  });
}
