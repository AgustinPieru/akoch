import prisma from '../../lib/prisma';

export async function getSettings() {
  return prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function updateSettings(data: { autoAdjustEnabled?: boolean }) {
  await getSettings();
  return prisma.setting.update({
    where: { id: 1 },
    data,
  });
}
