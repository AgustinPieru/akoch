import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PassThrough } from 'stream';
import prisma from '../../lib/prisma';
import { getAgencyProfile, drawDocumentHeader, drawDocumentFooter, AgencyProfile } from '../../lib/pdf-branding.helper';
import { amountToWordsEs } from '../../lib/numberToWordsEs';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CHARGE_CATEGORY_LABELS: Record<string, string> = {
  IMPUESTO: 'Impuesto', SERVICIO: 'Servicio', TASA: 'Tasa', OTRO: 'Otro',
};

const PAID_BY_LABELS: Record<string, string> = {
  AGENCY: 'Inmobiliaria', OWNER: 'Propietario', TENANT: 'Inquilino', SHARED: 'Compartido', N_A: '—',
};

const STATUS_LABELS: Record<string, string> = { DRAFT: 'BORRADOR', SENT: 'ENVIADA', PAID: 'PAGADA' };
const STATUS_COLORS: Record<string, string> = { DRAFT: '#777', SENT: '#0277bd', PAID: '#2e7d32' };

function formatMoney(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string | null | undefined) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '—';
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

// ─── Tabla genérica con bordes, tipo factura (misma identidad visual que el recibo) ──

interface TableColumn { key: string; label: string; width: number; align?: 'left' | 'right' | 'center' }
type TableCell = { text: string; color?: string };

function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  x0: number,
  y0: number,
  columns: TableColumn[],
  rows: Record<string, TableCell>[],
  rowH = 22,
): number {
  const x1 = x0 + columns.reduce((sum, c) => sum + c.width, 0);

  doc.rect(x0, y0, x1 - x0, rowH).fill('#EEF2F7');
  doc.fillColor('#1A3C5E').font('Helvetica-Bold').fontSize(8.5);
  let cx = x0;
  for (const col of columns) {
    doc.text(col.label.toUpperCase(), cx + 8, y0 + 8, { width: col.width - 16, align: col.align ?? 'left' });
    cx += col.width;
  }
  let y = y0 + rowH;

  for (const row of rows) {
    cx = x0;
    for (const col of columns) {
      const cell = row[col.key];
      doc.font('Helvetica').fontSize(9).fillColor(cell?.color ?? '#333');
      doc.text(cell?.text ?? '—', cx + 8, y + 6, { width: col.width - 16, align: col.align ?? 'left' });
      cx += col.width;
    }
    y += rowH;
    doc.moveTo(x0, y).lineTo(x1, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
  }

  doc.rect(x0, y0, x1 - x0, y - y0).strokeColor('#ccc').lineWidth(1).stroke();
  doc.fillColor('#333');
  return y;
}

// ─── Función compartida: construye el PDF en un PDFDocument ya creado ─────────

function buildSettlementDoc(doc: InstanceType<typeof PDFDocument>, settlement: SettlementData, agency: AgencyProfile) {
  const { currency } = settlement;
  const left = 50;
  const right = 545;
  const width = right - left;

  let y = drawDocumentHeader(doc, agency, 'Liquidación de propietario');

  // ── Fila: N° de liquidación / período (izq) + estado (der) ──
  const statusW = 150;
  const statusH = 42;
  const statusX = right - statusW;
  const infoY = y;

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A3C5E')
    .text(`LIQUIDACIÓN N° LIQ-${String(settlement.id).padStart(6, '0')}`, left, infoY, { width: statusX - left - 10 });
  doc.font('Helvetica').fontSize(9).fillColor('#333')
    .text(`Período: ${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`, left, doc.y + 5);
  if (settlement.paidAt) doc.text(`Pagada el: ${formatDate(settlement.paidAt)}`, left, doc.y + 2);

  const statusColor = STATUS_COLORS[settlement.status] ?? '#777';
  doc.rect(statusX, infoY, statusW, statusH).strokeColor(statusColor).lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#999')
    .text('ESTADO', statusX + 6, infoY + 9, { width: statusW - 12, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(statusColor)
    .text(STATUS_LABELS[settlement.status] ?? settlement.status, statusX + 6, doc.y + 2, { width: statusW - 12, align: 'center' });

  y = Math.max(doc.y, infoY + statusH) + 20;
  doc.fillColor('#333');

  // ── Propietario ──
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#777').text('PROPIETARIO', left, y);
  doc.font('Helvetica').fontSize(11).fillColor('#111').text(partyName(settlement.owner), left, y + 11);
  y = doc.y + 6;
  if (settlement.owner.cbu) {
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(`CBU: ${settlement.owner.cbu}${settlement.owner.bankName ? `  —  ${settlement.owner.bankName}` : ''}`, left, y);
    y = doc.y + 4;
  }
  y += 10;

  // ── Propiedades ──
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIEDADES', left, y);
  y = doc.y + 8;

  if (settlement.properties.length > 0) {
    const propColumns: TableColumn[] = [
      { key: 'property', label: 'Propiedad', width: 180 },
      { key: 'collected', label: 'Cobrado', width: 80, align: 'right' },
      { key: 'commission', label: 'Comisión', width: 80, align: 'right' },
      { key: 'expenses', label: 'Gastos', width: 78, align: 'right' },
      { key: 'subtotal', label: 'Subtotal', width: 77, align: 'right' },
    ];
    const propRows = settlement.properties.map((sp) => {
      const p = sp.property;
      const address = `${p.street} ${p.number}${p.floor ? ` P${p.floor}` : ''}${p.apartment ? ` D${p.apartment}` : ''}`
        + `${sp.sharePercentage < 100 ? ` (${sp.sharePercentage}%)` : ''}`;
      return {
        property: { text: address },
        collected: { text: formatMoney(sp.rentCollected, currency) },
        commission: { text: `-${formatMoney(sp.commissionAmount, currency)}`, color: '#c62828' },
        expenses: { text: sp.expensesAmount > 0 ? `-${formatMoney(sp.expensesAmount, currency)}` : '—', color: sp.expensesAmount > 0 ? '#c62828' : '#999' },
        subtotal: { text: formatMoney(sp.subtotal, currency), color: '#1A3C5E' },
      };
    });
    y = drawTable(doc, left, y, propColumns, propRows) + 14;
  } else {
    doc.font('Helvetica').fontSize(10).fillColor('#888').text('Sin propiedades con cobros en este período.', left, y);
    y = doc.y + 14;
  }

  // ── Cargos ad-hoc ──
  if (settlement.charges.length > 0) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('IMPUESTOS, SERVICIOS Y OTROS CARGOS', left, y);
    y = doc.y + 8;

    const chargeColumns: TableColumn[] = [
      { key: 'category', label: 'Categoría', width: 85 },
      { key: 'description', label: 'Descripción', width: 210 },
      { key: 'paidBy', label: 'Paga', width: 100 },
      { key: 'amount', label: 'Monto', width: 100, align: 'right' },
    ];
    const chargeRows = settlement.charges.map((c) => {
      const deducts = c.paidBy !== 'OWNER';
      return {
        category: { text: CHARGE_CATEGORY_LABELS[c.category] ?? c.category },
        description: { text: c.description },
        paidBy: { text: PAID_BY_LABELS[c.paidBy] ?? c.paidBy },
        amount: { text: deducts ? `-${formatMoney(c.amount, currency)}` : formatMoney(c.amount, currency), color: deducts ? '#c62828' : '#999' },
      };
    });
    y = drawTable(doc, left, y, chargeColumns, chargeRows) + 14;
  }

  // ── Resumen + caja de neto destacada ──
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('RESUMEN', left, y);
  y = doc.y + 10;

  const amountX = 440;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text('Total cobrado', left, y); doc.text(formatMoney(settlement.totalRent, currency), amountX, y, { width: right - amountX, align: 'right' });
  y += 20;
  doc.fillColor('#c62828');
  doc.text('Comisión de administración', left, y); doc.text(`-${formatMoney(settlement.totalCommission, currency)}`, amountX, y, { width: right - amountX, align: 'right' });
  y += 20;
  if (settlement.totalExpenses > 0) {
    doc.text('Gastos pagados por la inmobiliaria', left, y); doc.text(`-${formatMoney(settlement.totalExpenses, currency)}`, amountX, y, { width: right - amountX, align: 'right' });
    y += 20;
  }
  if (settlement.totalCharges > 0) {
    doc.text('Impuestos, servicios y otros cargos', left, y); doc.text(`-${formatMoney(settlement.totalCharges, currency)}`, amountX, y, { width: right - amountX, align: 'right' });
    y += 20;
  }
  doc.fillColor('#333');

  y += 6;
  const totalBoxH = 32;
  doc.rect(left, y, width, totalBoxH).fill('#1A3C5E');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13);
  doc.text('NETO A TRANSFERIR', left + 12, y + 9);
  doc.text(formatMoney(settlement.netAmount, currency), amountX - 30, y + 9, { width: right - (amountX - 30) - 12, align: 'right' });
  y += totalBoxH + 20;
  doc.fillColor('#333');

  // ── Monto en palabras ──
  const currencyLabel = currency === 'USD' ? 'dólares estadounidenses' : 'pesos';
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1A3C5E').text('Son:', left, y);
  y = doc.y + 3;
  doc.font('Helvetica').fontSize(10).fillColor('#333')
    .text(`${amountToWordsEs(settlement.netAmount, currencyLabel)}.`, left, y, { width });
  y = doc.y + 16;

  if (settlement.notes) {
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(`Notas: ${settlement.notes}`, left, y, { width });
    y = doc.y + 12;
  }

  drawDocumentFooter(doc, agency, 'Este documento es una liquidación emitida por');
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
  doc.end();
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
    doc.end();
  });
}
