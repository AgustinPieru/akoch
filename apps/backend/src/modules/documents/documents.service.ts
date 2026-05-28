import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export type EntityType = 'owner' | 'tenant' | 'property' | 'contract';

function fileUrl(filename: string) {
  return `/uploads/${filename}`;
}

export async function listDocuments(entityType: EntityType, entityId: number) {
  return prisma.document.findMany({
    where: { entityType, entityId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDocument(
  entityType: EntityType,
  entityId: number,
  file: Express.Multer.File,
  body: { name?: string; fileType?: string; notes?: string },
) {
  return prisma.document.create({
    data: {
      entityType,
      entityId,
      name: body.name || file.originalname,
      fileType: body.fileType || 'otro',
      url: fileUrl(file.filename),
      sizeBytes: file.size,
      mimeType: file.mimetype,
      notes: body.notes,
    },
  });
}

export async function deleteDocument(id: number) {
  const doc = await prisma.document.findFirst({ where: { id, deletedAt: null } });
  if (!doc) return null;

  // Soft delete
  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });

  // Remove physical file
  const filename = doc.url.replace('/uploads/', '');
  const filePath = path.join(process.cwd(), 'uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return doc;
}
