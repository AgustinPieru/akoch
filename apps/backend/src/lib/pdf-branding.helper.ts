import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import prisma from './prisma';

export interface AgencyProfile {
  name: string;
  cuit: string | null;
  address: string | null;
  phone: string | null;
  license: string | null;
  logoPath: string | null;
}

const DEFAULT_AGENCY_NAME = 'Akoch Administración Inmobiliaria';

export async function getAgencyProfile(): Promise<AgencyProfile> {
  const settings = await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  let logoPath: string | null = null;
  if (settings.logoUrl) {
    const filename = settings.logoUrl.split('/uploads/')[1];
    if (filename) {
      const candidate = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(candidate)) logoPath = candidate;
    }
  }

  return {
    name: settings.agencyName || DEFAULT_AGENCY_NAME,
    cuit: settings.agencyCuit,
    address: settings.agencyAddress,
    phone: settings.agencyPhone,
    license: settings.agencyLicense,
    logoPath,
  };
}

// Encabezado tipo factura: logo (si hay) + datos de la agencia arriba, y el título del comprobante
// en su propia línea debajo (nunca al lado del nombre de la agencia — con nombres largos se pisaban).
// Termina con una línea divisoria. Devuelve el Y desde donde seguir.
export function drawDocumentHeader(doc: InstanceType<typeof PDFDocument>, agency: AgencyProfile, title: string): number {
  const top = 45;
  const hasLogo = !!agency.logoPath;
  const textX = hasLogo ? 118 : 50;
  const textWidth = 545 - textX;

  if (hasLogo) {
    try {
      doc.image(agency.logoPath as string, 50, top, { fit: [58, 58] });
    } catch {
      // Si el archivo no es una imagen válida, seguimos sin logo en vez de romper el PDF.
    }
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1A3C5E').text(agency.name, textX, top, { width: textWidth });
  doc.font('Helvetica').fontSize(8.5).fillColor('#666');
  if (agency.address) doc.text(agency.address, textX, doc.y + 2, { width: textWidth });
  const contactLine = [
    agency.phone ? `Tel: ${agency.phone}` : null,
    agency.license ? `Mat. ${agency.license}` : null,
    agency.cuit ? `CUIT ${agency.cuit}` : null,
  ].filter(Boolean).join('  —  ');
  if (contactLine) doc.text(contactLine, textX, doc.y + 2, { width: textWidth });

  const blockBottom = Math.max(doc.y, top + 58);

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1A3C5E').text(title.toUpperCase(), 50, blockBottom + 12, { width: 495, align: 'right' });

  const ruleY = doc.y + 10;
  doc.moveTo(50, ruleY).lineTo(545, ruleY).strokeColor('#1A3C5E').lineWidth(2).stroke();
  doc.y = ruleY + 14;
  doc.x = 50;

  return doc.y;
}

export function drawDocumentFooter(doc: InstanceType<typeof PDFDocument>, agency: AgencyProfile, text: string) {
  const y = doc.page.height - 100;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#1A3C5E').lineWidth(1).stroke();
  doc.fontSize(9).fillColor('#888').text(`${text} ${agency.name}.`, 50, y + 12, { align: 'center', width: 495 });
}
