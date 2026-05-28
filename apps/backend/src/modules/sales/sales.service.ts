import { Currency, Prisma, SaleStage } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildWordSearch } from '../../lib/searchUtils';

export interface SalesQuery {
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateSaleInput {
  propertyId: number;
  askingPrice: number;
  currency?: string;
  stage?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  offerAmount?: number;
  closingDate?: string;
  commissionPct?: number;
  notes?: string;
}

const saleInclude = {
  property: {
    select: {
      id: true, street: true, number: true, city: true, type: true, coveredSurface: true,
      owners: { include: { owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true } } } },
    },
  },
};

export async function getSales(query: SalesQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 100);
  const skip = (page - 1) * limit;
  const searchFilter = query.search
    ? buildWordSearch(query.search, (w) => [
        { property: { street: { contains: w, mode: 'insensitive' } } } as Prisma.SaleWhereInput,
        { property: { city: { contains: w, mode: 'insensitive' } } } as Prisma.SaleWhereInput,
        { buyerName: { contains: w, mode: 'insensitive' } } as Prisma.SaleWhereInput,
        { property: { owners: { some: { owner: { firstName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SaleWhereInput,
        { property: { owners: { some: { owner: { lastName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SaleWhereInput,
        { property: { owners: { some: { owner: { businessName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SaleWhereInput,
      ])
    : undefined;

  const where: Prisma.SaleWhereInput = {
    deletedAt: null,
    ...(query.stage && { stage: query.stage as SaleStage }),
    ...(searchFilter && searchFilter),
  };
  const [data, total] = await Promise.all([
    prisma.sale.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: saleInclude }),
    prisma.sale.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getSaleById(id: number) {
  const sale = await prisma.sale.findFirst({ where: { id, deletedAt: null }, include: saleInclude });
  if (!sale) throw { status: 404, message: 'Venta no encontrada', code: 'NOT_FOUND' };
  return sale;
}

export async function createSale(input: CreateSaleInput) {
  return prisma.sale.create({
    data: {
      propertyId: input.propertyId,
      askingPrice: input.askingPrice,
      currency: (input.currency as Currency) ?? 'USD',
      stage: (input.stage as SaleStage) ?? 'PROSPECTING',
      buyerName: input.buyerName ?? null,
      buyerPhone: input.buyerPhone ?? null,
      buyerEmail: input.buyerEmail ?? null,
      offerAmount: input.offerAmount ?? null,
      closingDate: input.closingDate ? new Date(input.closingDate) : null,
      commissionPct: input.commissionPct ?? 3,
      commissionAmount: input.offerAmount ? (input.offerAmount * (input.commissionPct ?? 3)) / 100 : null,
      notes: input.notes ?? null,
    },
    include: saleInclude,
  });
}

export async function updateSale(id: number, input: Partial<CreateSaleInput>) {
  await getSaleById(id);
  const commissionAmount = input.offerAmount != null && input.commissionPct != null
    ? (input.offerAmount * input.commissionPct) / 100
    : undefined;
  return prisma.sale.update({
    where: { id },
    data: {
      ...(input.stage && { stage: input.stage as SaleStage }),
      ...(input.buyerName !== undefined && { buyerName: input.buyerName || null }),
      ...(input.buyerPhone !== undefined && { buyerPhone: input.buyerPhone || null }),
      ...(input.buyerEmail !== undefined && { buyerEmail: input.buyerEmail || null }),
      ...(input.askingPrice !== undefined && { askingPrice: input.askingPrice }),
      ...(input.offerAmount !== undefined && { offerAmount: input.offerAmount }),
      ...(input.commissionPct !== undefined && { commissionPct: input.commissionPct }),
      ...(commissionAmount !== undefined && { commissionAmount }),
      ...(input.closingDate !== undefined && { closingDate: input.closingDate ? new Date(input.closingDate) : null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
    include: saleInclude,
  });
}

export async function deleteSale(id: number) {
  await getSaleById(id);
  return prisma.sale.update({ where: { id }, data: { deletedAt: new Date() } });
}
