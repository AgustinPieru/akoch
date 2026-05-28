import PDFDocument from 'pdfkit';
import { Response } from 'express';
import prisma from '../../lib/prisma';

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

function buildReceiptDoc(doc: InstanceType<typeof PDFDocument>, payment: PaymentWithRelations) {
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

  // Encabezado
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('RECIBO DE ALQUILER', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#666').text('Akoch Administración Inmobiliaria', { align: 'center' });
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1A3C5E').lineWidth(2).stroke();
  doc.moveDown(0.8);

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

  // Detalle del pago
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text('DETALLE', col1, y);
  y += lineH;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Concepto', col1, y); doc.text('Monto', 450, y);
  y += lineH * 0.8;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').lineWidth(0.5).stroke();
  y += 8;

  doc.font('Helvetica').text(`Alquiler ${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`, col1, y);
  doc.text(formatMoney(Number(payment.paidAmount ?? 0), contract.currency), 450, y);
  y += lineH;

  if (payment.interestAmount && Number(payment.interestAmount) > 0) {
    doc.fillColor('#e65100').text(`Intereses por mora (${payment.interestDays ?? 0} días)`, col1, y);
    doc.text(formatMoney(Number(payment.interestAmount), contract.currency), 450, y);
    doc.fillColor('#333');
    y += lineH;
  }

  if (Number(payment.paidAmount) < Number(payment.expectedAmount)) {
    doc.fillColor('#e65100').text(`(Monto esperado: ${formatMoney(Number(payment.expectedAmount), contract.currency)})`, col1, y);
    doc.fillColor('#333');
    y += lineH;
  }

  y += 8;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#1A3C5E').lineWidth(1.5).stroke();
  y += 12;

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A3C5E');
  doc.text('TOTAL COBRADO:', col1, y);
  doc.text(formatMoney(Number(payment.paidAmount ?? 0), contract.currency), 450, y);
  y += lineH * 1.5;

  doc.font('Helvetica').fontSize(10).fillColor('#555');
  doc.text(`Medio de pago: ${METHOD_LABELS[payment.paymentMethod ?? ''] || payment.paymentMethod || '—'}`, col1, y);
  if (payment.notes) { y += lineH; doc.text(`Notas: ${payment.notes}`, col1, y); }

  // Pie
  const footerY = doc.page.height - 100;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#1A3C5E').lineWidth(1).stroke();
  doc.fontSize(9).fillColor('#888').text(
    'Este comprobante es válido como recibo de pago. Akoch Administración Inmobiliaria.',
    col1, footerY + 12, { align: 'center', width: 495 },
  );
}

// ─── Streaming a Response (descarga web) ─────────────────────────────────────

export async function generatePaymentReceipt(paymentId: number, res: Response) {
  const payment = await fetchPaymentForReceipt(paymentId);
  if (!payment) throw { status: 404, message: 'Cobro no encontrado', code: 'NOT_FOUND' };
  if (payment.status !== 'PAID' && payment.status !== 'PARTIAL') {
    throw { status: 409, message: 'Solo se puede generar recibo de pagos cobrados', code: 'NOT_PAID' };
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${payment.id}-${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}.pdf"`);
  doc.pipe(res);
  buildReceiptDoc(doc, payment);
  doc.end();
}

// ─── Buffer (WhatsApp / Email) ────────────────────────────────────────────────

export async function generateReceiptBuffer(paymentId: number): Promise<{ buffer: Buffer; filename: string; period: string }> {
  const payment = await fetchPaymentForReceipt(paymentId);
  if (!payment) throw { status: 404, message: 'Cobro no encontrado', code: 'NOT_FOUND' };

  const period = `${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`;
  const filename = `recibo-${payment.id}-${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}.pdf`;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildReceiptDoc(doc, payment);
    doc.end();
  });

  return { buffer, filename, period };
}
