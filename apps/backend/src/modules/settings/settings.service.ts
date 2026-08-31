import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';

export async function getSettings() {
  return prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export interface UpdateSettingsInput {
  autoAdjustEnabled?: boolean;
  lateNotificationsEnabled?: boolean;
  expiryNotificationsEnabled?: boolean;
  monthlyNotificationsEnabled?: boolean;
  agencyName?: string;
  agencyCuit?: string;
  agencyAddress?: string;
  agencyPhone?: string;
  agencyLicense?: string;
}

export async function updateSettings(data: UpdateSettingsInput) {
  await getSettings();
  return prisma.setting.update({
    where: { id: 1 },
    data,
  });
}

export async function setLogo(file: Express.Multer.File) {
  const current = await getSettings();

  if (current.logoUrl) {
    const oldFilename = current.logoUrl.replace(`${env.BACKEND_URL}/uploads/`, '');
    const oldPath = path.join(process.cwd(), 'uploads', oldFilename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const logoUrl = `${env.BACKEND_URL}/uploads/${file.filename}`;
  return prisma.setting.update({ where: { id: 1 }, data: { logoUrl } });
}
