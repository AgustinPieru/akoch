import { PrismaClient, PhotoType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';

const prisma = new PrismaClient();

function fileUrl(filename: string) {
  return `${env.BACKEND_URL}/uploads/${filename}`;
}

export async function listPhotos(propertyId: number) {
  return prisma.propertyPhoto.findMany({
    where: { propertyId },
    orderBy: { takenAt: 'desc' },
  });
}

export async function addPhoto(
  propertyId: number,
  file: Express.Multer.File,
  body: { type?: string; caption?: string },
) {
  return prisma.propertyPhoto.create({
    data: {
      propertyId,
      url: fileUrl(file.filename),
      type: (body.type as PhotoType) || PhotoType.GENERAL,
      caption: body.caption,
    },
  });
}

export async function deletePhoto(id: number) {
  const photo = await prisma.propertyPhoto.findFirst({ where: { id } });
  if (!photo) return null;

  await prisma.propertyPhoto.delete({ where: { id } });

  const filename = photo.url.replace('/uploads/', '');
  const filePath = path.join(process.cwd(), 'uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return photo;
}
