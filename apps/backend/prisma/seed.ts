import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const d = (s: string) => new Date(s);

// ─── helpers ──────────────────────────────────────────────────────────────────

function makePayment(
  contractId: number,
  year: number,
  month: number,
  amount: number,
  status: 'PAID' | 'PENDING' | 'LATE',
  idx: number,
) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    contractId,
    periodYear: year,
    periodMonth: month,
    expectedAmount: amount,
    paidAmount: status === 'PAID' ? amount : null,
    status,
    dueDate: d(`${year}-${pad(month)}-10`),
    paidAt: status === 'PAID' ? d(`${year}-${pad(month)}-08`) : null,
    paymentMethod: status === 'PAID' ? ('TRANSFER' as const) : null,
    receiptNumber: status === 'PAID' ? `REC-${contractId}-${String(idx).padStart(3, '0')}` : null,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── ADMIN ──────────────────────────────────────────────────────────────────
  const pw = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@akoch.com' },
    update: {},
    create: { email: 'admin@akoch.com', password: pw, name: 'Administrador', role: 'ADMIN' },
  });
  console.log('✅ Admin creado');

  // Skip if demo data already seeded
  if (await prisma.owner.findUnique({ where: { cuit: '20304567891' } })) {
    console.log('ℹ️  Demo data ya existe, omitiendo seed');
    return;
  }

  // ── PROPIETARIOS ───────────────────────────────────────────────────────────
  const owner1 = await prisma.owner.create({
    data: {
      type: 'PERSONA_FISICA', firstName: 'Carlos', lastName: 'Rodríguez',
      cuit: '20304567891', taxStatus: 'MONOTRIBUTISTA',
      address: 'Av. Corrientes 1234, CABA', phone: '1140001111',
      email: 'carlos.rodriguez@example.com',
      cbu: '0070123420000012345678', bankName: 'Banco Nación', status: 'ACTIVE',
    },
  });

  const owner2 = await prisma.owner.create({
    data: {
      type: 'PERSONA_FISICA', firstName: 'Ana', lastName: 'García',
      cuit: '27287654320', taxStatus: 'RESPONSABLE_INSCRIPTO',
      address: 'Av. Santa Fe 2500, CABA', phone: '1155002222',
      email: 'ana.garcia@example.com',
      cbu: '0700012340000021654321', bankName: 'Banco Santander', status: 'ACTIVE',
    },
  });

  const owner3 = await prisma.owner.create({
    data: {
      type: 'PERSONA_JURIDICA', businessName: 'Inmuebles del Sur SA',
      cuit: '30712345678', taxStatus: 'RESPONSABLE_INSCRIPTO',
      address: 'Av. Juan B. Justo 800, CABA', phone: '1122223333',
      email: 'info@inmueblessur.example.com',
      cbu: '0290067210000030001234', bankName: 'Banco Galicia', status: 'ACTIVE',
    },
  });
  console.log('✅ Propietarios creados');

  // ── PROPIEDADES ────────────────────────────────────────────────────────────
  // 1 · Casa Palermo — RENTED, contrato activo al día
  const prop1 = await prisma.property.create({ data: {
    type: 'CASA', street: 'Thames', number: '1876', city: 'CABA',
    rooms: '4', coveredSurface: 120, totalSurface: 150, appraisalUsd: 180000,
    status: 'RENTED',
    owners: { create: { ownerId: owner1.id, percentage: 100 } },
  }});

  // 2 · Depto Recoleta — RENTED, contrato vence en 15 días
  const prop2 = await prisma.property.create({ data: {
    type: 'DEPARTAMENTO', street: 'Av. Alvear', number: '1450', floor: '3', apartment: 'B',
    city: 'CABA', rooms: '2', coveredSurface: 65, appraisalUsd: 95000,
    status: 'RENTED',
    owners: { create: { ownerId: owner2.id, percentage: 100 } },
  }});

  // 3 · Local Caballito — RENTED, contrato vence en 60 días
  const prop3 = await prisma.property.create({ data: {
    type: 'LOCAL_COMERCIAL', street: 'Av. Rivadavia', number: '5300', city: 'CABA',
    coveredSurface: 80, appraisalUsd: 120000,
    status: 'RENTED',
    owners: { create: { ownerId: owner1.id, percentage: 100 } },
  }});

  // 4 · Depto Belgrano — RENTED, contrato ya vencido (para probar run-expire)
  const prop4 = await prisma.property.create({ data: {
    type: 'DEPARTAMENTO', street: 'Av. Cabildo', number: '2200', floor: '5', apartment: 'A',
    city: 'CABA', rooms: '3', coveredSurface: 80, appraisalUsd: 110000,
    status: 'RENTED',
    owners: { create: { ownerId: owner3.id, percentage: 100 } },
  }});

  // 5 · Depto Villa Crespo — AVAILABLE, publicado para alquilar
  await prisma.property.create({ data: {
    type: 'DEPARTAMENTO', street: 'Av. Corrientes', number: '5800', floor: '1', apartment: 'C',
    city: 'CABA', rooms: '2', coveredSurface: 55, appraisalUsd: 75000,
    status: 'AVAILABLE', publishForRent: true,
    owners: { create: { ownerId: owner2.id, percentage: 100 } },
  }});

  // 6 · Casa Flores — FOR_SALE
  const prop6 = await prisma.property.create({ data: {
    type: 'CASA', street: 'Av. Rivadavia', number: '7800', city: 'CABA',
    rooms: '5', coveredSurface: 180, totalSurface: 220, appraisalUsd: 250000,
    status: 'FOR_SALE', publishForSale: true,
    owners: { create: { ownerId: owner1.id, percentage: 100 } },
  }});

  // 7 · Depto San Telmo — RENTED, inquilino con pagos atrasados (Agustín)
  const prop7 = await prisma.property.create({ data: {
    type: 'DEPARTAMENTO', street: 'Defensa', number: '890', floor: '2', apartment: 'D',
    city: 'CABA', rooms: '2', coveredSurface: 60, appraisalUsd: 85000,
    status: 'RENTED',
    owners: { create: { ownerId: owner3.id, percentage: 100 } },
  }});

  // 8 · Depto Barracas — OCCUPIED_WITHOUT_CONTRACT (ocupación informal)
  const prop8 = await prisma.property.create({ data: {
    type: 'DEPARTAMENTO', street: 'Av. Montes de Oca', number: '440', floor: '3', apartment: 'A',
    city: 'CABA', rooms: '2', coveredSurface: 50, appraisalUsd: 60000,
    status: 'OCCUPIED_WITHOUT_CONTRACT',
    owners: { create: { ownerId: owner2.id, percentage: 100 } },
  }});
  console.log('✅ Propiedades creadas');

  // ── INQUILINOS ─────────────────────────────────────────────────────────────
  const tenant1 = await prisma.tenant.create({ data: {
    type: 'PERSONA_FISICA', firstName: 'María', lastName: 'López',
    dni: '31234567', phone: '1144445555', email: 'maria.lopez@example.com',
    employmentStatus: 'EMPLEADO_RELACION_DEPENDENCIA', status: 'ACTIVE',
  }});

  const tenant2 = await prisma.tenant.create({ data: {
    type: 'PERSONA_FISICA', firstName: 'Juan', lastName: 'Pérez',
    dni: '28765432', phone: '1155556666', email: 'juan.perez@example.com',
    employmentStatus: 'AUTONOMO', status: 'ACTIVE',
  }});

  const tenant3 = await prisma.tenant.create({ data: {
    type: 'PERSONA_JURIDICA', businessName: 'Comercio Norte SRL',
    cuit: '30651234567', phone: '1133334444', email: 'admin@comercionorte.example.com',
    status: 'ACTIVE',
  }});

  const tenant4 = await prisma.tenant.create({ data: {
    type: 'PERSONA_FISICA', firstName: 'Roberto', lastName: 'Silva',
    dni: '25678901', phone: '1166667777', email: 'roberto.silva@example.com',
    employmentStatus: 'JUBILADO', status: 'ACTIVE',
  }});

  // Agustín — datos del usuario, contrato con pago atrasado para probar notificaciones
  const tenant5 = await prisma.tenant.create({ data: {
    type: 'PERSONA_FISICA', firstName: 'Agustín', lastName: 'Pieruccioni',
    dni: '543492419859', phone: '1177778888', email: 'agustinpieruccioni@gmail.com',
    employmentStatus: 'EMPLEADO_RELACION_DEPENDENCIA',
    address: 'Defensa 890 2°D, San Telmo, CABA', status: 'ACTIVE',
  }});
  console.log('✅ Inquilinos creados');

  // ── CONTRATOS ──────────────────────────────────────────────────────────────

  // C1 · Palermo + María — activo, al día, próximo ajuste junio
  const c1 = await prisma.contract.create({ data: {
    propertyId: prop1.id,
    startDate: d('2025-06-01'), endDate: d('2027-05-31'), durationMonths: 24,
    initialAmount: 200000, currentAmount: 325000, currency: 'ARS',
    indexType: 'ICL_BCRA', updateFrequency: 'QUARTERLY', adminCommissionPct: 10,
    status: 'ACTIVE',
    lastAdjustmentDate: d('2026-03-01'), nextAdjustmentDate: d('2026-06-01'),
    tenants: { create: { tenantId: tenant1.id, isPrimary: true } },
  }});

  await prisma.contractAdjustment.createMany({ data: [
    { contractId: c1.id, appliedAt: d('2025-09-01'), previousAmount: 200000, newAmount: 260000, percentage: 30, indexType: 'ICL_BCRA', indexValue: 130, notes: 'Ajuste Q3 2025' },
    { contractId: c1.id, appliedAt: d('2025-12-01'), previousAmount: 260000, newAmount: 325000, percentage: 25, indexType: 'ICL_BCRA', indexValue: 125, notes: 'Ajuste Q4 2025' },
  ]});

  // C2 · Recoleta + Juan — vence en 15 días (2026-06-15) → dispara run-expiry-alerts
  const c2 = await prisma.contract.create({ data: {
    propertyId: prop2.id,
    startDate: d('2024-06-15'), endDate: d('2026-06-15'), durationMonths: 24,
    initialAmount: 150000, currentAmount: 350000, currency: 'ARS',
    indexType: 'ICL_BCRA', updateFrequency: 'QUARTERLY', adminCommissionPct: 10,
    status: 'ACTIVE',
    lastAdjustmentDate: d('2026-03-15'), nextAdjustmentDate: d('2026-06-15'),
    tenants: { create: { tenantId: tenant2.id, isPrimary: true } },
  }});

  // C3 · Caballito + Comercio Norte — vence en 60 días (2026-07-31) → dispara run-expiry-alerts
  // nextAdjustmentDate en el pasado → dispara run-adjustments
  const c3 = await prisma.contract.create({ data: {
    propertyId: prop3.id,
    startDate: d('2024-08-01'), endDate: d('2026-07-31'), durationMonths: 24,
    initialAmount: 280000, currentAmount: 580000, currency: 'ARS',
    indexType: 'ICL_BCRA', updateFrequency: 'QUARTERLY', adminCommissionPct: 10,
    status: 'ACTIVE',
    lastAdjustmentDate: d('2026-02-01'), nextAdjustmentDate: d('2026-05-01'),
    tenants: { create: { tenantId: tenant3.id, isPrimary: true } },
  }});

  // C4 · Belgrano + Roberto — status ACTIVE pero endDate pasado → dispara run-expire
  const c4 = await prisma.contract.create({ data: {
    propertyId: prop4.id,
    startDate: d('2025-05-01'), endDate: d('2026-04-30'), durationMonths: 12,
    initialAmount: 180000, currentAmount: 270000, currency: 'ARS',
    indexType: 'ICL_BCRA', updateFrequency: 'QUARTERLY', adminCommissionPct: 10,
    status: 'ACTIVE',
    tenants: { create: { tenantId: tenant4.id, isPrimary: true } },
  }});

  // C5 · San Telmo + Agustín — activo, pago de abril 2026 PENDING vencido → dispara run-late-payments
  const c5 = await prisma.contract.create({ data: {
    propertyId: prop7.id,
    startDate: d('2025-05-01'), endDate: d('2027-04-30'), durationMonths: 24,
    initialAmount: 160000, currentAmount: 245000, currency: 'ARS',
    indexType: 'ICL_BCRA', updateFrequency: 'QUARTERLY', adminCommissionPct: 10,
    status: 'ACTIVE',
    lastAdjustmentDate: d('2026-02-01'), nextAdjustmentDate: d('2026-05-01'),
    tenants: { create: { tenantId: tenant5.id, isPrimary: true } },
  }});
  console.log('✅ Contratos creados');

  // ── PAGOS ──────────────────────────────────────────────────────────────────

  // C1: Jun 2025 → Abr 2026 PAID | May 2026 PENDING
  await prisma.payment.createMany({ data: [
    makePayment(c1.id, 2025,  6, 200000, 'PAID',    1),
    makePayment(c1.id, 2025,  7, 200000, 'PAID',    2),
    makePayment(c1.id, 2025,  8, 200000, 'PAID',    3),
    makePayment(c1.id, 2025,  9, 260000, 'PAID',    4),
    makePayment(c1.id, 2025, 10, 260000, 'PAID',    5),
    makePayment(c1.id, 2025, 11, 260000, 'PAID',    6),
    makePayment(c1.id, 2025, 12, 325000, 'PAID',    7),
    makePayment(c1.id, 2026,  1, 325000, 'PAID',    8),
    makePayment(c1.id, 2026,  2, 325000, 'PAID',    9),
    makePayment(c1.id, 2026,  3, 325000, 'PAID',   10),
    makePayment(c1.id, 2026,  4, 325000, 'PAID',   11),
    makePayment(c1.id, 2026,  5, 325000, 'PENDING', 12),
  ]});

  // C2: últimos meses PAID | May 2026 PENDING
  await prisma.payment.createMany({ data: [
    makePayment(c2.id, 2025,  9, 220000, 'PAID',   1),
    makePayment(c2.id, 2025, 10, 220000, 'PAID',   2),
    makePayment(c2.id, 2025, 11, 220000, 'PAID',   3),
    makePayment(c2.id, 2025, 12, 285000, 'PAID',   4),
    makePayment(c2.id, 2026,  1, 285000, 'PAID',   5),
    makePayment(c2.id, 2026,  2, 285000, 'PAID',   6),
    makePayment(c2.id, 2026,  3, 350000, 'PAID',   7),
    makePayment(c2.id, 2026,  4, 350000, 'PAID',   8),
    makePayment(c2.id, 2026,  5, 350000, 'PENDING', 9),
  ]});

  // C3: últimos meses PAID | May 2026 PENDING
  await prisma.payment.createMany({ data: [
    makePayment(c3.id, 2025, 11, 390000, 'PAID',   1),
    makePayment(c3.id, 2025, 12, 390000, 'PAID',   2),
    makePayment(c3.id, 2026,  1, 480000, 'PAID',   3),
    makePayment(c3.id, 2026,  2, 480000, 'PAID',   4),
    makePayment(c3.id, 2026,  3, 580000, 'PAID',   5),
    makePayment(c3.id, 2026,  4, 580000, 'PAID',   6),
    makePayment(c3.id, 2026,  5, 580000, 'PENDING', 7),
  ]});

  // C4: historial PAID + Mar/Abr 2026 LATE (contrato vencido, no renovó)
  await prisma.payment.createMany({ data: [
    makePayment(c4.id, 2025,  5, 180000, 'PAID',  1),
    makePayment(c4.id, 2025,  6, 180000, 'PAID',  2),
    makePayment(c4.id, 2025,  7, 180000, 'PAID',  3),
    makePayment(c4.id, 2025,  8, 230000, 'PAID',  4),
    makePayment(c4.id, 2025,  9, 230000, 'PAID',  5),
    makePayment(c4.id, 2025, 10, 230000, 'PAID',  6),
    makePayment(c4.id, 2025, 11, 270000, 'PAID',  7),
    makePayment(c4.id, 2025, 12, 270000, 'PAID',  8),
    makePayment(c4.id, 2026,  1, 270000, 'PAID',  9),
    makePayment(c4.id, 2026,  2, 270000, 'PAID', 10),
    makePayment(c4.id, 2026,  3, 270000, 'LATE', 11),
    makePayment(c4.id, 2026,  4, 270000, 'LATE', 12),
  ]});

  // C5 (Agustín): historial PAID | Abr 2026 PENDING vencido → run-late-payments lo marca LATE
  await prisma.payment.createMany({ data: [
    makePayment(c5.id, 2025,  5, 160000, 'PAID',    1),
    makePayment(c5.id, 2025,  6, 160000, 'PAID',    2),
    makePayment(c5.id, 2025,  7, 160000, 'PAID',    3),
    makePayment(c5.id, 2025,  8, 200000, 'PAID',    4),
    makePayment(c5.id, 2025,  9, 200000, 'PAID',    5),
    makePayment(c5.id, 2025, 10, 200000, 'PAID',    6),
    makePayment(c5.id, 2025, 11, 245000, 'PAID',    7),
    makePayment(c5.id, 2025, 12, 245000, 'PAID',    8),
    makePayment(c5.id, 2026,  1, 245000, 'PAID',    9),
    makePayment(c5.id, 2026,  2, 245000, 'PAID',   10),
    makePayment(c5.id, 2026,  3, 245000, 'PAID',   11),
    makePayment(c5.id, 2026,  4, 245000, 'PENDING', 12), // dueDate 10/04 → vencido
    makePayment(c5.id, 2026,  5, 245000, 'PENDING', 13),
  ]});
  console.log('✅ Pagos creados');

  // ── LIQUIDACIONES ──────────────────────────────────────────────────────────
  await prisma.settlement.createMany({ data: [
    {
      propertyId: prop1.id, contractId: c1.id,
      periodYear: 2026, periodMonth: 3, status: 'PAID',
      rentCollected: 325000, commissionPct: 10, commissionAmount: 32500,
      expensesAmount: 8500, netAmount: 284000, currency: 'ARS',
      paidAt: d('2026-03-20'), notes: 'Liquidación marzo 2026',
    },
    {
      propertyId: prop1.id, contractId: c1.id,
      periodYear: 2026, periodMonth: 4, status: 'SENT',
      rentCollected: 325000, commissionPct: 10, commissionAmount: 32500,
      expensesAmount: 7200, netAmount: 285300, currency: 'ARS',
      sentAt: d('2026-04-18'), notes: 'Liquidación abril 2026',
    },
    {
      propertyId: prop1.id, contractId: c1.id,
      periodYear: 2026, periodMonth: 5, status: 'DRAFT',
      rentCollected: 325000, commissionPct: 10, commissionAmount: 32500,
      expensesAmount: 0, netAmount: 292500, currency: 'ARS',
      notes: 'Liquidación mayo 2026 — pendiente de envío',
    },
    {
      propertyId: prop3.id, contractId: c3.id,
      periodYear: 2026, periodMonth: 4, status: 'PAID',
      rentCollected: 580000, commissionPct: 10, commissionAmount: 58000,
      expensesAmount: 15000, netAmount: 507000, currency: 'ARS',
      paidAt: d('2026-04-22'), notes: 'Liquidación abril 2026 — local comercial',
    },
  ]});
  console.log('✅ Liquidaciones creadas');

  // ── GASTOS ─────────────────────────────────────────────────────────────────
  await prisma.expense.createMany({ data: [
    {
      propertyId: prop1.id, contractId: c1.id,
      category: 'ABL', description: 'ABL Mayo 2026',
      amount: 4200, currency: 'ARS', date: d('2026-05-05'),
      periodYear: 2026, periodMonth: 5, paidBy: 'TENANT',
    },
    {
      propertyId: prop1.id, contractId: c1.id,
      category: 'EXPENSAS', description: 'Expensas ordinarias Mayo 2026',
      amount: 18500, currency: 'ARS', date: d('2026-05-10'),
      periodYear: 2026, periodMonth: 5, paidBy: 'TENANT',
    },
    {
      propertyId: prop3.id, contractId: c3.id,
      category: 'REPARACION', description: 'Reparación sistema eléctrico tablero',
      amount: 65000, currency: 'ARS', date: d('2026-04-15'),
      periodYear: 2026, periodMonth: 4, paidBy: 'OWNER',
      invoiceNumber: 'FAC-00234',
    },
    {
      propertyId: prop7.id, contractId: c5.id,
      category: 'SEGURO', description: 'Seguro del inmueble anual',
      amount: 95000, currency: 'ARS', date: d('2026-05-01'),
      periodYear: 2026, periodMonth: 5, paidBy: 'OWNER',
    },
    {
      propertyId: prop1.id, contractId: c1.id,
      category: 'GAS', description: 'Revisión instalación de gas (reglamentaria)',
      amount: 12000, currency: 'ARS', date: d('2026-04-20'),
      periodYear: 2026, periodMonth: 4, paidBy: 'OWNER',
      invoiceNumber: 'FAC-00198',
    },
  ]});
  console.log('✅ Gastos creados');

  // ── REPARACIONES ───────────────────────────────────────────────────────────
  await prisma.repair.createMany({ data: [
    {
      propertyId: prop1.id,
      title: 'Goteras en techo',
      description: 'Filtración de agua en dormitorio principal durante lluvias fuertes',
      category: 'Impermeabilización', status: 'COMPLETED', priority: 'HIGH',
      provider: 'Impermeabilizaciones García', providerPhone: '1144332211',
      estimatedCost: 45000, actualCost: 52000, currency: 'ARS',
      reportedAt: d('2025-11-10'), scheduledAt: d('2025-11-20'), completedAt: d('2025-11-22'),
      notes: 'Se aplicó membrana líquida en toda la terraza. Garantía 2 años.',
    },
    {
      propertyId: prop3.id,
      title: 'Pérdida de agua en baño',
      description: 'Cañería con pérdida debajo del lavatorio del baño principal',
      category: 'Plomería', status: 'PENDING', priority: 'URGENT',
      provider: 'Plomería Rodríguez', providerPhone: '1155443322',
      estimatedCost: 25000, currency: 'ARS',
      reportedAt: d('2026-05-28'), scheduledAt: d('2026-06-02'),
      notes: 'Inquilino reportó pérdida visible. Turno confirmado.',
    },
    {
      propertyId: prop7.id,
      title: 'Aire acondicionado no enfría',
      description: 'Split 3000 frig del comedor no alcanza temperatura correcta',
      category: 'Climatización', status: 'IN_PROGRESS', priority: 'MEDIUM',
      provider: 'Técnico Frío Norte', providerPhone: '1166554433',
      estimatedCost: 35000, currency: 'ARS',
      reportedAt: d('2026-05-15'), scheduledAt: d('2026-05-25'),
      notes: 'Diagnosticaron falta de gas refrigerante. Turno para recarga pendiente.',
    },
    {
      propertyId: prop4.id,
      title: 'Cerradura puerta principal rota',
      description: 'Llave se parte dentro de la cerradura, no abre desde afuera',
      category: 'Cerrajería', status: 'COMPLETED', priority: 'URGENT',
      provider: 'Cerrajería 24hs Belgrano', providerPhone: '1177889900',
      estimatedCost: 8000, actualCost: 9500, currency: 'ARS',
      reportedAt: d('2026-03-10'), scheduledAt: d('2026-03-10'), completedAt: d('2026-03-10'),
      notes: 'Servicio de emergencia. Se cambió cilindro completo.',
    },
  ]});
  console.log('✅ Reparaciones creadas');

  // ── VENTA ──────────────────────────────────────────────────────────────────
  await prisma.sale.create({ data: {
    propertyId: prop6.id,
    askingPrice: 250000, currency: 'USD',
    stage: 'NEGOTIATING',
    buyerName: 'Familia Martínez', buyerPhone: '1188997766',
    buyerEmail: 'martinez.compra@gmail.com',
    offerAmount: 230000, commissionPct: 3, commissionAmount: 6900,
    notes: 'Compradores con fuerte interés, gestionando crédito hipotecario. Segunda reunión pactada para el 05/06.',
  }});
  console.log('✅ Venta creada');

  // ── OCUPACIÓN INFORMAL ─────────────────────────────────────────────────────
  await prisma.informalOccupation.create({ data: {
    propertyId: prop8.id,
    occupantName: 'Pedro González',
    occupantPhone: '1199887766',
    startDate: d('2026-03-01'),
    reason: 'EXPIRED_CONTRACT',
    informalAmount: 80000, currency: 'ARS',
    status: 'ACTIVE', alertActive: true,
    notes: 'Ex-inquilino que no renovó contrato pero continúa en la propiedad. Notificación extrajudicial enviada el 15/03.',
  }});
  console.log('✅ Ocupación informal creada');

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  console.log('');
  console.log('🌱 Seed completo. Resumen:');
  console.log('   3 propietarios  |  8 propiedades  |  5 inquilinos  |  5 contratos');
  console.log('');
  console.log('🧪 Jobs para probar:');
  console.log('   POST /api/v1/contracts/run-expire         → C4 Belgrano pasa a EXPIRED');
  console.log('   POST /api/v1/automation/run-late-payments → Pago abr/26 de Agustín pasa a LATE');
  console.log('   POST /api/v1/automation/run-expiry-alerts → Alertas C2 (15 días) y C3 (60 días)');
  console.log('   POST /api/v1/contracts/run-adjustments   → C3 y C5 (nextAdjustmentDate vencida)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
