import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PassThrough } from 'stream';
import prisma from '../../lib/prisma';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  AGUA: 'Agua', ELECTRICIDAD: 'Electricidad', GAS: 'Gas', EXPENSAS: 'Expensas', ABL: 'Tasa municipal', API: 'API',
  REPARACION: 'Reparación', SEGURO: 'Seguro', HONORARIOS: 'Honorarios', OTRO: 'Otro',
};

function formatMoney(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

async function fetchSettlementData(settlementId: number) {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      property: {
        select: {
          street: true, number: true, floor: true, apartment: true, city: true, province: true,
          owners: {
            include: {
              owner: {
                select: { firstName: true, lastName: true, businessName: true, type: true, cbu: true, bankName: true },
              },
            },
          },
        },
      },
      contract: { select: { id: true, adminCommissionPct: true, currency: true } },
    },
  });
  if (!settlement) throw { status: 404, message: 'Liquidación no encontrada', code: 'NOT_FOUND' };

  const expenses = await prisma.expense.findMany({
    where: {
      propertyId: settlement.propertyId,
      periodYear: settlement.periodYear,
      periodMonth: settlement.periodMonth,
      paidBy: { not: 'OWNER' },
      deletedAt: null,
    },
    orderBy: { date: 'asc' },
  });

  return { settlement, expenses };
}

function buildSettlementDoc(doc: InstanceType<typeof PDFDocument>, settlement: Awaited<ReturnType<typeof fetchSettlementData>>['settlement'], expenses: Awaited<ReturnType<typeof fetchSettlementData>>['expenses']) {
  const primaryOwner = settlement.property.owners[0]?.owner;
  const ownerName = primaryOwner
    ? primaryOwner.type === 'PERSONA_JURIDICA'
      ? (primaryOwner.businessName ?? '—')
      : [primaryOwner.firstName, primaryOwner.lastName].filter(Boolean).join(' ')
    : '—';

  const { currency } = settlement;
  const property = settlement.property;
  const propertyAddress = `${property.street} ${property.number}${property.floor ? ` P${property.floor}` : ''}${property.apartment ? ` D${property.apartment}` : ''}`;

  const col1 = 50;
  const col2 = 300;
  const lineH = 20;
  const amountX = 410;
  const amountW = 135; // right edge at 545 (page 595 - margin 50)

  doc.fontSize(20).font('Helvetica-Bold').text('LIQUIDACIÓN DE ALQUILER', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#666').text('Akoch Administración Inmobiliaria', { align: 'center' });
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1A3C5E').lineWidth(2).stroke();
  doc.moveDown(0.8);

  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Período:', col1, y);
  doc.font('Helvetica').text(`${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`, col1 + 70, y);
  doc.font('Helvetica-Bold').text('N° Liquidación:', col2, y);
  doc.font('Helvetica').text(`LIQ-${String(settlement.id).padStart(6, '0')}`, col2 + 100, y);
  y += lineH;
  doc.font('Helvetica-Bold').text('Estado:', col1, y);
  const statusLabel: Record<string, string> = { DRAFT: 'Borrador', SENT: 'Enviada', PAID: 'Pagada' };
  doc.font('Helvetica').text(statusLabel[settlement.status] ?? settlement.status, col1 + 70, y);
  if (settlement.paidAt) {
    doc.font('Helvetica-Bold').text('Pagada el:', col2, y);
    doc.font('Helvetica').text(new Date(settlement.paidAt).toLocaleDateString('es-AR'), col2 + 70, y);
  }
  y += lineH * 1.5;

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIEDAD', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(propertyAddress, col1, y);
  doc.text(`${property.city}, ${property.province || 'Buenos Aires'}`, col1, y + lineH);
  y += lineH * 2.5;

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIETARIO', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(ownerName, col1, y);
  if (primaryOwner?.cbu) {
    y += lineH;
    doc.text(`CBU: ${primaryOwner.cbu}${primaryOwner.bankName ? `  —  ${primaryOwner.bankName}` : ''}`, col1, y);
  }
  y += lineH * 2;

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('DETALLE FINANCIERO', col1, y);
  y += lineH;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Concepto', col1, y);
  doc.text('Monto', amountX, y, { width: amountW, align: 'right' });
  y += lineH * 0.7;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').lineWidth(0.5).stroke();
  y += 8;

  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(`Alquiler cobrado — ${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`, col1, y, { width: 350 });
  doc.text(formatMoney(settlement.rentCollected, currency), amountX, y, { width: amountW, align: 'right' });
  y += lineH;

  doc.fillColor('#c62828');
  doc.text(`Comision administracion (${settlement.commissionPct}%)`, col1 + 10, y, { width: 340 });
  doc.text(`-${formatMoney(settlement.commissionAmount, currency)}`, amountX, y, { width: amountW, align: 'right' });
  doc.fillColor('#333');
  y += lineH;

  if (expenses.length > 0) {
    for (const exp of expenses) {
      const catLabel = EXPENSE_CATEGORY_LABELS[exp.category] ?? exp.category;
      const descText = `${catLabel}: ${exp.description}`;
      const descWidth = 340;
      const descHeight = doc.heightOfString(descText, { width: descWidth });
      doc.fillColor('#c62828');
      doc.text(descText, col1 + 10, y, { width: descWidth });
      doc.text(`-${formatMoney(exp.amount, currency)}`, amountX, y, { width: amountW, align: 'right' });
      doc.fillColor('#333');
      y += Math.max(lineH, descHeight + 4);
    }
  } else if (settlement.expensesAmount > 0) {
    doc.fillColor('#c62828');
    doc.text('Gastos pagados por inmobiliaria', col1 + 10, y, { width: 340 });
    doc.text(`-${formatMoney(settlement.expensesAmount, currency)}`, amountX, y, { width: amountW, align: 'right' });
    doc.fillColor('#333');
    y += lineH;
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

  y = doc.page.height - 100;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#1A3C5E').lineWidth(1).stroke();
  y += 12;
  doc.fontSize(9).fillColor('#888').text(
    'Este documento es una liquidación emitida por Akoch Administración Inmobiliaria.',
    col1, y,
    { align: 'center', width: 495 },
  );

  doc.end();
}

export async function generateSettlementPdf(settlementId: number, res: Response) {
  const { settlement, expenses } = await fetchSettlementData(settlementId);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="liquidacion-${settlement.id}-${settlement.periodYear}-${String(settlement.periodMonth).padStart(2, '0')}.pdf"`,
  );
  doc.pipe(res);
  buildSettlementDoc(doc, settlement, expenses);
}

export async function generateSettlementBuffer(settlementId: number): Promise<{ buffer: Buffer; filename: string; period: string }> {
  const { settlement, expenses } = await fetchSettlementData(settlementId);

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
    buildSettlementDoc(doc, settlement, expenses);
  });
}
