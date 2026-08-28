import PDFDocument from 'pdfkit';
import { Response } from 'express';
import prisma from '../../lib/prisma';
import { getAgencyProfile, drawDocumentHeader, drawDocumentFooter, AgencyProfile } from '../../lib/pdf-branding.helper';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', CHECK: 'Cheque', OTHER: 'Otro',
};

function formatMoney(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

// Tipo del payment con todas las relaciones necesarias
type PaymentWithRelations = NonNullable<Awaited<ReturnType<typeof fetchPaymentForReceipt>>>;

async function fetchPaymentForReceipt(paymentId: number) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: {
          property: {
            include: {
              owners: { include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true } } } },
            },
          },
          tenants: {
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, dni: true, cuit: true } } },
          },
        },
      },
    },
  });
}

// ─── Función compartida: construye el PDF en un PDFDocument ya creado ─────────

function buildReceiptDoc(doc: InstanceType<typeof PDFDocument>, payment: PaymentWithRelations, agency: AgencyProfile) {
  const { contract } = payment;
  const property = contract.property;
  const primaryTenant = contract.tenants.find((t) => t.isPrimary) || contract.tenants[0];
  const tenant = primaryTenant?.tenant;
  const tenantName = tenant
    ? tenant.type === 'PERSONA_JURIDICA'
      ? (tenant.businessName ?? '—')
      : [tenant.firstName, tenant.lastName].filter(Boolean).join(' ')
    : '—';
  const tenantDoc = tenant?.dni || tenant?.cuit || '';

  const col1 = 50;
  const col2 = 300;
  const lineH = 20;

  drawDocumentHeader(doc, agency, 'RECIBO DE ALQUILER');

  // Info del recibo
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Período:', col1, y); doc.font('Helvetica').text(`${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`, col1 + 80, y);
  doc.font('Helvetica-Bold').text('N° Recibo:', col2, y); doc.font('Helvetica').text(payment.receiptNumber || `REC-${String(payment.id).padStart(6, '0')}`, col2 + 80, y);
  y += lineH;
  doc.font('Helvetica-Bold').text('Fecha de pago:', col1, y); doc.font('Helvetica').text(payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('es-AR') : '—', col1 + 80, y);
  doc.font('Helvetica-Bold').text('Vencimiento:', col2, y); doc.font('Helvetica').text(new Date(payment.dueDate).toLocaleDateString('es-AR'), col2 + 80, y);
  y += lineH * 1.5;

  // Propiedad
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('PROPIEDAD', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(`${property.street} ${property.number}${property.floor ? ` P${property.floor}` : ''}${property.apartment ? ` D${property.apartment}` : ''}`, col1, y);
  doc.text(`${property.city}, ${property.province || 'Buenos Aires'}`, col1, y + lineH);
  y += lineH * 2.5;

  // Inquilino
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('INQUILINO', col1, y);
  y += lineH;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(tenantName, col1, y);
  if (tenantDoc) doc.text(`DNI/CUIT: ${tenantDoc}`, col1, y + lineH);
  y += lineH * 2.5;

  // Detalle — tabla tipo factura
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('DETALLE', col1, y);
  y += lineH;

  const tableLeft = 50;
  const tableRight = 545;
  const amountColX = 440;
  const rowH = 22;

  const rows: { label: string; amount: number; color?: string }[] = [
    { label: `Alquiler ${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`, amount: Number(payment.paidAmount ?? 0) },
  ];
  if (payment.interestAmount && Number(payment.interestAmount) > 0) {
    rows.push({ label: `Intereses por mora (${payment.interestDays ?? 0} días)`, amount: Number(payment.interestAmount), color: '#e65100' });
  }

  const tableTop = y;
  doc.rect(tableLeft, tableTop, tableRight - tableLeft, rowH).fill('#EEF2F7');
  doc.fillColor('#1A3C5E').font('Helvetica-Bold').fontSize(9);
  doc.text('CONCEPTO', tableLeft + 10, tableTop + 7);
  doc.text('MONTO', amountColX, tableTop + 7, { width: tableRight - amountColX - 10, align: 'right' });
  y = tableTop + rowH;

  for (const row of rows) {
    doc.font('Helvetica').fontSize(10).fillColor(row.color ?? '#333');
    doc.text(row.label, tableLeft + 10, y + 6, { width: amountColX - tableLeft - 20 });
    doc.text(formatMoney(row.amount, contract.currency), amountColX, y + 6, { width: tableRight - amountColX - 10, align: 'right' });
    y += rowH;
    doc.moveTo(tableLeft, y).lineTo(tableRight, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
  }
  doc.rect(tableLeft, tableTop, tableRight - tableLeft, y - tableTop).strokeColor('#ccc').lineWidth(1).stroke();
  doc.fillColor('#333');

  if (Number(payment.paidAmount) < Number(payment.expectedAmount)) {
    y += 6;
    doc.font('Helvetica').fontSize(9).fillColor('#e65100').text(
      `(Monto esperado: ${formatMoney(Number(payment.expectedAmount), contract.currency)})`, tableLeft, y,
    );
    y += lineH * 0.8;
  }

  // Caja de total destacada
  y += 10;
  const totalBoxH = 32;
  doc.rect(tableLeft, y, tableRight - tableLeft, totalBoxH).fill('#1A3C5E');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13);
  doc.text('TOTAL COBRADO', tableLeft + 12, y + 9);
  doc.text(formatMoney(Number(payment.paidAmount ?? 0), contract.currency), amountColX - 30, y + 9, { width: tableRight - (amountColX - 30) - 12, align: 'right' });
  y += totalBoxH + lineH;

  doc.font('Helvetica').fontSize(10).fillColor('#555');
  doc.text(`Medio de pago: ${METHOD_LABELS[payment.paymentMethod ?? ''] || payment.paymentMethod || '—'}`, col1, y);
  if (payment.notes) { y += lineH; doc.text(`Notas: ${payment.notes}`, col1, y); }

  drawDocumentFooter(doc, agency, 'Este comprobante es válido como recibo de pago.');
}

// ─── Streaming a Response (descarga web) ─────────────────────────────────────

export async function generatePaymentReceipt(paymentId: number, res: Response) {
  const payment = await fetchPaymentForReceipt(paymentId);
  if (!payment) throw { status: 404, message: 'Cobro no encontrado', code: 'NOT_FOUND' };
  if (payment.status !== 'PAID' && payment.status !== 'PARTIAL') {
    throw { status: 409, message: 'Solo se puede generar recibo de pagos cobrados', code: 'NOT_PAID' };
  }
  const agency = await getAgencyProfile();

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${payment.id}-${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}.pdf"`);
  doc.pipe(res);
  buildReceiptDoc(doc, payment, agency);
  doc.end();
}

// ─── Buffer (WhatsApp / Email) ────────────────────────────────────────────────

export async function generateReceiptBuffer(paymentId: number): Promise<{ buffer: Buffer; filename: string; period: string }> {
  const payment = await fetchPaymentForReceipt(paymentId);
  if (!payment) throw { status: 404, message: 'Cobro no encontrado', code: 'NOT_FOUND' };
  const agency = await getAgencyProfile();

  const period = `${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`;
  const filename = `recibo-${payment.id}-${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}.pdf`;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildReceiptDoc(doc, payment, agency);
    doc.end();
  });

  return { buffer, filename, period };
}
