import PDFDocument from 'pdfkit';
import { Response } from 'express';
import prisma from '../../lib/prisma';
import { getAgencyProfile, drawDocumentHeader, drawDocumentFooter, AgencyProfile } from '../../lib/pdf-branding.helper';
import { amountToWordsEs } from '../../lib/numberToWordsEs';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', CHECK: 'Cheque', OTHER: 'Otro',
};

function formatMoney(amount: number, currency: string) {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string | null | undefined) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '—';
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
              owners: { include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true, cuit: true } } } },
            },
          },
          tenants: {
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, dni: true, cuit: true, address: true } } },
          },
        },
      },
    },
  });
}

function personName(p: { type: string; firstName: string | null; lastName: string | null; businessName: string | null }) {
  if (p.type === 'PERSONA_JURIDICA') return p.businessName ?? '—';
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
}

// ─── Función compartida: construye el PDF en un PDFDocument ya creado ─────────

function buildReceiptDoc(doc: InstanceType<typeof PDFDocument>, payment: PaymentWithRelations, agency: AgencyProfile) {
  const { contract } = payment;
  const property = contract.property;
  const primaryTenant = contract.tenants.find((t) => t.isPrimary) || contract.tenants[0];
  const tenant = primaryTenant?.tenant;
  const tenantName = tenant ? personName(tenant) : '—';
  const tenantDoc = tenant?.cuit || tenant?.dni || '—';
  const tenantAddress = tenant?.address || '—';
  const ownerNames = property.owners.map((po) => personName(po.owner)).join(' / ') || '—';
  const propertyAddress = `${property.street} ${property.number}${property.floor ? ` P${property.floor}` : ''}${property.apartment ? ` D${property.apartment}` : ''}`;

  const left = 50;
  const right = 545;
  const width = right - left;
  const col2X = left + width / 2 + 10;

  let y = drawDocumentHeader(doc, agency, 'Recibo');

  // ── Fila: N° de recibo / fecha (izq) + sello "no válido como factura" (der) ──
  const stampW = 150;
  const stampH = 42;
  const stampX = right - stampW;
  const infoY = y;

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A3C5E')
    .text(`RECIBO N° ${payment.receiptNumber || String(payment.id).padStart(8, '0')}`, left, infoY, { width: stampX - left - 10 });
  doc.font('Helvetica').fontSize(9).fillColor('#333')
    .text(`Fecha: ${formatDate(payment.paidAt ?? new Date())}`, left, doc.y + 5);
  if (agency.cuit) doc.text(`CUIT: ${agency.cuit}`, left, doc.y + 2);

  doc.rect(stampX, infoY, stampW, stampH).strokeColor('#999').lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#666')
    .text('DOCUMENTO NO VÁLIDO', stampX + 6, infoY + 12, { width: stampW - 12, align: 'center' });
  doc.text('COMO FACTURA', stampX + 6, doc.y + 1, { width: stampW - 12, align: 'center' });

  y = Math.max(doc.y, infoY + stampH) + 16;

  // ── Banner de cobro por cuenta y orden de terceros ──
  const bannerH = 32;
  doc.rect(left, y, width, bannerH).fill('#1A3C5E');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9).text(
    'COBRO POR CUENTA Y ORDEN DE TERCEROS. IMPORTE PARA SER ENTREGADO AL PROPIETARIO O A QUIEN CORRESPONDA.',
    left + 10, y + 10, { width: width - 20, align: 'center' },
  );
  y += bannerH + 18;
  doc.fillColor('#333');

  // ── Datos del cliente / contrato / inmueble ──
  const colWidth = col2X - left - 20;
  const fieldRow = (fields: [string, string][], rowH = 30) => {
    fields.forEach(([label, value], i) => {
      const x = i === 0 ? left : col2X;
      const w = i === 0 ? colWidth : right - col2X;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#777').text(label.toUpperCase(), x, y, { width: w });
      doc.font('Helvetica').fontSize(10).fillColor('#111').text(value || '—', x, y + 11, { width: w });
    });
    y += rowH;
  };

  fieldRow([['Cliente', tenantName], ['CUIT / DNI', tenantDoc]]);
  fieldRow([['Dirección', tenantAddress], ['Localidad', property.city]]);
  fieldRow([['Contrato inicio', formatDate(contract.startDate)], ['Contrato fin', formatDate(contract.endDate)]]);
  fieldRow([['En concepto de', 'ALQUILER']]);
  fieldRow([['Dirección del inmueble', propertyAddress], ['Localidad', property.city]]);
  fieldRow([['Propietario', ownerNames]]);

  y += 4;
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 14;

  // ── Detalle — tabla tipo factura ──
  const tableLeft = left;
  const tableRight = right;
  const amountColX = 440;
  const rowH = 22;

  const interest = Number(payment.interestAmount || 0);
  const totalPaid = Number(payment.paidAmount ?? payment.expectedAmount ?? 0);
  const rentAmount = totalPaid - interest;

  const rows: { label: string; amount: number; color?: string }[] = [
    { label: `Correspondiente al mes de ${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}`, amount: rentAmount },
  ];
  if (interest > 0) {
    rows.push({ label: `Otros conceptos — intereses por mora (${payment.interestDays ?? 0} días)`, amount: interest, color: '#e65100' });
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
    y += 16;
  }

  // Caja de total destacada
  y += 10;
  const totalBoxH = 32;
  doc.rect(tableLeft, y, tableRight - tableLeft, totalBoxH).fill('#1A3C5E');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13);
  doc.text('TOTAL RECIBO', tableLeft + 12, y + 9);
  doc.text(formatMoney(totalPaid, contract.currency), amountColX - 30, y + 9, { width: tableRight - (amountColX - 30) - 12, align: 'right' });
  y += totalBoxH + 20;
  doc.fillColor('#333');

  if (payment.notes) {
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(`Notas: ${payment.notes}`, tableLeft, y, { width });
    y = doc.y + 12;
  }

  doc.font('Helvetica').fontSize(9).fillColor('#555')
    .text(`Medio de pago: ${METHOD_LABELS[payment.paymentMethod ?? ''] || payment.paymentMethod || '—'}`, tableLeft, y);
  y = doc.y + 20;

  // ── Monto en palabras + firma ──
  const currencyLabel = contract.currency === 'USD' ? 'dólares estadounidenses' : 'pesos';
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#ddd').lineWidth(1).stroke();
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1A3C5E').text('Recibí(mos) la suma de:', tableLeft, y);
  y = doc.y + 3;
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(
    `${amountToWordsEs(totalPaid, currencyLabel)}.`, tableLeft, y, { width },
  );
  y = doc.y + 36;

  const sigW = 220;
  const sigX = tableRight - sigW;
  doc.moveTo(sigX, y).lineTo(tableRight, y).strokeColor('#333').lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(9).fillColor('#555').text('Firma y aclaración', sigX, y + 4, { width: sigW, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#999').text('Original', tableLeft, y + 4);

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
