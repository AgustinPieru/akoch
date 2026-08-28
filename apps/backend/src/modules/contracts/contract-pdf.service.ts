import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { getAgencyProfile, drawDocumentHeader, drawDocumentFooter, AgencyProfile } from '../../lib/pdf-branding.helper';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const INDEX_LABELS: Record<string, string> = {
  ICL_BCRA: 'ICL — Banco Central', IPC_INDEC: 'IPC — INDEC', FREE: 'Porcentaje libre', NONE: 'Sin ajuste',
};

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', FOUR_MONTHLY: 'Cuatrimestral', SEMI_ANNUAL: 'Semestral', ANNUAL: 'Anual',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB por foto
const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15MB por video — tope práctico para que el email no rebote
const MAX_PHOTOS = 6;
const MAX_VIDEOS = 2;
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];

function isVideoUrl(url: string) {
  const clean = url.split('?')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

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

async function fetchContractForPdf(contractId: number) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, deletedAt: null },
    include: {
      property: {
        include: {
          owners: {
            include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true, cuit: true } } },
          },
        },
      },
      tenants: {
        include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, dni: true, cuit: true } } },
      },
      guarantors: { where: { deletedAt: null }, orderBy: { id: 'asc' } },
    },
  });
  if (!contract) throw { status: 404, message: 'Contrato no encontrado', code: 'NOT_FOUND' };
  return contract;
}

type ContractWithRelations = Awaited<ReturnType<typeof fetchContractForPdf>>;

function buildContractSummaryDoc(doc: InstanceType<typeof PDFDocument>, contract: ContractWithRelations, agency: AgencyProfile) {
  const property = contract.property;
  const propertyAddress = `${property.street} ${property.number}${property.floor ? ` P${property.floor}` : ''}${property.apartment ? ` D${property.apartment}` : ''}`;
  const col1 = 50;
  const lineH = 18;

  drawDocumentHeader(doc, agency, 'RESUMEN DE CONTRATO');

  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
  doc.text('Contrato N°:', col1, y);
  doc.font('Helvetica').text(`CTR-${String(contract.id).padStart(6, '0')}`, col1 + 90, y);
  doc.font('Helvetica-Bold').text('Estado:', 300, y);
  const statusLabel: Record<string, string> = { DRAFT: 'Borrador', ACTIVE: 'Activo', EXPIRED: 'Vencido', TERMINATED: 'Rescindido', RENEWED: 'Renovado' };
  doc.font('Helvetica').text(statusLabel[contract.status] ?? contract.status, 300 + 60, y);
  y += lineH * 1.5;

  const section = (title: string) => {
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A3C5E').text(title, col1, y);
    y += lineH;
    doc.font('Helvetica').fontSize(10).fillColor('#333');
  };

  section('PROPIEDAD');
  doc.text(propertyAddress, col1, y); y += lineH;
  doc.text(`${property.city}, ${property.province || 'Buenos Aires'}`, col1, y); y += lineH * 1.3;

  section('PROPIETARIO(S)');
  for (const po of property.owners) {
    doc.text(`${partyName(po.owner)}${po.owner.cuit ? `  —  CUIT ${po.owner.cuit}` : ''}`, col1, y);
    y += lineH;
  }
  y += lineH * 0.3;

  section('INQUILINO(S)');
  for (const ct of contract.tenants) {
    const tenantDoc = ct.tenant.dni || ct.tenant.cuit || '';
    doc.text(`${partyName(ct.tenant)}${ct.isPrimary ? ' (Titular)' : ''}${tenantDoc ? `  —  DNI/CUIT ${tenantDoc}` : ''}`, col1, y);
    y += lineH;
  }
  y += lineH * 0.3;

  section('PERÍODO Y CONDICIONES ECONÓMICAS');
  doc.text(`Inicio: ${new Date(contract.startDate).toLocaleDateString('es-AR')}     Vencimiento: ${new Date(contract.endDate).toLocaleDateString('es-AR')}     (${contract.durationMonths} meses)`, col1, y);
  y += lineH;
  doc.text(`Monto inicial: ${formatMoney(contract.initialAmount, contract.currency)}     Monto actual: ${formatMoney(contract.currentAmount, contract.currency)}`, col1, y);
  y += lineH;
  doc.text(`Ajuste: ${INDEX_LABELS[contract.indexType] ?? contract.indexType}${contract.indexType !== 'NONE' ? `  —  ${FREQ_LABELS[contract.updateFrequency] ?? contract.updateFrequency}` : ''}${contract.freePercentage ? `  (${contract.freePercentage}%)` : ''}`, col1, y);
  y += lineH;
  doc.text(`Comisión de administración: ${contract.adminCommissionPct}%`, col1, y);
  y += lineH * 1.3;

  if (contract.guarantors.length > 0) {
    section('GARANTES');
    for (const g of contract.guarantors) {
      doc.text(`${g.fullName}${g.dni ? `  —  DNI ${g.dni}` : ''}`, col1, y);
      y += lineH;
      if (g.address || g.phone) {
        doc.fontSize(9).fillColor('#666').text([g.address, g.phone].filter(Boolean).join('  —  '), col1, y);
        doc.fontSize(10).fillColor('#333');
        y += lineH;
      }
    }
    y += lineH * 0.3;
  }

  if (contract.specialClauses) {
    section('CLÁUSULAS ESPECIALES');
    const height = doc.heightOfString(contract.specialClauses, { width: 495 });
    doc.text(contract.specialClauses, col1, y, { width: 495 });
    y += height + lineH * 0.5;
  }

  drawDocumentFooter(doc, agency, 'Este documento es un resumen administrativo generado por el sistema, no reemplaza al contrato firmado por las partes.');
}

export async function generateContractSummaryPdf(contractId: number, res: Response) {
  const [contract, agency] = await Promise.all([fetchContractForPdf(contractId), getAgencyProfile()]);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="contrato-${contract.id}-resumen.pdf"`);
  doc.pipe(res);
  buildContractSummaryDoc(doc, contract, agency);
  doc.end();
}

export async function generateContractSummaryBuffer(contractId: number): Promise<{ buffer: Buffer; filename: string; propertyLabel: string }> {
  const [contract, agency] = await Promise.all([fetchContractForPdf(contractId), getAgencyProfile()]);
  const propertyLabel = `${contract.property.street} ${contract.property.number}, ${contract.property.city}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (c: Buffer) => chunks.push(c));
    passThrough.on('end', () => {
      resolve({ buffer: Buffer.concat(chunks), filename: `contrato-${contract.id}-resumen.pdf`, propertyLabel });
    });
    passThrough.on('error', reject);

    doc.pipe(passThrough);
    buildContractSummaryDoc(doc, contract, agency);
    doc.end();
  });
}

type ReadResult = { content: Buffer } | { skipped: true; sizeBytes: number } | null;

function readUploadedFile(url: string, maxBytes: number): ReadResult {
  const filename = url.split('/uploads/')[1];
  if (!filename) return null;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  if (!fs.existsSync(filePath)) return null;
  const sizeBytes = fs.statSync(filePath).size;
  if (sizeBytes > maxBytes) return { skipped: true, sizeBytes };
  return { content: fs.readFileSync(filePath) };
}

export interface ContractEmailAttachments {
  attachments: { filename: string; content: Buffer }[];
  // Archivos que no se pudieron adjuntar por superar el tamaño permitido (típicamente videos pesados).
  skipped: { filename: string; sizeBytes: number }[];
}

// Fotos y videos de la propiedad y documentos ya subidos al contrato (p.ej. el contrato firmado
// escaneado), para adjuntar junto con el resumen al enviar por email. Los videos tienen su propio
// límite de tamaño (más alto que el de las fotos) y cualquier archivo que no entre queda listado en
// `skipped` en vez de descartarse en silencio.
export async function getContractEmailAttachments(contractId: number): Promise<ContractEmailAttachments> {
  const contract = await prisma.contract.findFirst({ where: { id: contractId }, select: { propertyId: true } });
  if (!contract) throw { status: 404, message: 'Contrato no encontrado', code: 'NOT_FOUND' };

  const [media, documents] = await Promise.all([
    prisma.propertyPhoto.findMany({
      where: { propertyId: contract.propertyId, type: { not: 'DOCUMENT' } },
      orderBy: { takenAt: 'desc' },
    }),
    prisma.document.findMany({ where: { entityType: 'contract', entityId: contractId, deletedAt: null } }),
  ]);

  const images = media.filter((m) => !isVideoUrl(m.url)).slice(0, MAX_PHOTOS);
  const videos = media.filter((m) => isVideoUrl(m.url)).slice(0, MAX_VIDEOS);

  const attachments: { filename: string; content: Buffer }[] = [];
  const skipped: { filename: string; sizeBytes: number }[] = [];

  const collect = (filename: string, result: ReadResult) => {
    if (!result) return;
    if ('content' in result) attachments.push({ filename, content: result.content });
    else skipped.push({ filename, sizeBytes: result.sizeBytes });
  };

  images.forEach((photo, i) => {
    collect(`foto-propiedad-${i + 1}${path.extname(photo.url) || '.jpg'}`, readUploadedFile(photo.url, MAX_IMAGE_BYTES));
  });
  videos.forEach((video, i) => {
    collect(`video-propiedad-${i + 1}${path.extname(video.url) || '.mp4'}`, readUploadedFile(video.url, MAX_VIDEO_BYTES));
  });
  for (const docRow of documents) {
    collect(docRow.name || path.basename(docRow.url), readUploadedFile(docRow.url, MAX_IMAGE_BYTES));
  }

  return { attachments, skipped };
}
