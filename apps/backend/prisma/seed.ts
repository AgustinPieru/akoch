import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@akoch.com' },
    update: {},
    create: {
      email: 'admin@akoch.com',
      password,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  console.log('Seed completado. Usuario: admin@akoch.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
