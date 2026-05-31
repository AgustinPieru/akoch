import { Currency, ExpenseCategory, PaidBy, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildWordSearch } from '../../lib/searchUtils';

export interface ExpensesQuery {
  propertyId?: number;
  contractId?: number;
  category?: string;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  search?: string;
  ownerId?: number;
  tenantId?: number;
  paidBy?: string;
}

export interface CreateExpenseInput {
  propertyId: number;
  contractId?: number;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  paidBy?: string;
  invoiceNumber?: string;
  notes?: string;
}

const expenseInclude = {
  property: { select: { id: true, street: true, number: true, city: true } },
  contract: { select: { id: true } },
};

export async function getExpenses(query: ExpensesQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const searchFilter = query.search
    ? buildWordSearch(query.search, (w) => [
        { property: { street: { contains: w, mode: 'insensitive' } } } as Prisma.ExpenseWhereInput,
        { property: { city: { contains: w, mode: 'insensitive' } } } as Prisma.ExpenseWhereInput,
        { property: { owners: { some: { owner: { firstName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.ExpenseWhereInput,
        { property: { owners: { some: { owner: { lastName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.ExpenseWhereInput,
        { property: { owners: { some: { owner: { businessName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.ExpenseWhereInput,
        { description: { contains: w, mode: 'insensitive' } } as Prisma.ExpenseWhereInput,
      ])
    : undefined;

  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    ...(query.propertyId && { propertyId: query.propertyId }),
    ...(query.contractId && { contractId: query.contractId }),
    ...(query.category && { category: query.category as ExpenseCategory }),
    ...(query.year && { periodYear: query.year }),
    ...(query.month && { periodMonth: query.month }),
    ...(query.ownerId && { property: { owners: { some: { ownerId: query.ownerId } } } }),
    ...(query.tenantId && { contract: { tenants: { some: { tenantId: query.tenantId } } } }),
    ...(query.paidBy && { paidBy: query.paidBy as PaidBy }),
    ...(searchFilter && searchFilter),
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'desc' }],
      include: expenseInclude,
    }),
    prisma.expense.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getExpenseById(id: number) {
  const expense = await prisma.expense.findFirst({
    where: { id, deletedAt: null },
    include: expenseInclude,
  });
  if (!expense) throw { status: 404, message: 'Gasto no encontrado', code: 'NOT_FOUND' };
  return expense;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function createExpense(input: CreateExpenseInput) {
  const date = parseLocalDate(input.date);
  return prisma.expense.create({
    data: {
      propertyId: input.propertyId,
      contractId: input.contractId ?? null,
      category: input.category as ExpenseCategory,
      description: input.description,
      amount: input.amount,
      currency: (input.currency as Currency) ?? 'ARS',
      date,
      periodYear: date.getFullYear(),
      periodMonth: date.getMonth() + 1,
      paidBy: (input.paidBy as PaidBy) ?? 'AGENCY',
      invoiceNumber: input.invoiceNumber ?? null,
      notes: input.notes ?? null,
    },
    include: expenseInclude,
  });
}

export async function updateExpense(id: number, input: Partial<CreateExpenseInput>) {
  await getExpenseById(id);
  const date = input.date ? parseLocalDate(input.date) : undefined;
  return prisma.expense.update({
    where: { id },
    data: {
      ...(input.category && { category: input.category as ExpenseCategory }),
      ...(input.description && { description: input.description }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency && { currency: input.currency as Currency }),
      ...(date && { date, periodYear: date.getFullYear(), periodMonth: date.getMonth() + 1 }),
      ...(input.paidBy && { paidBy: input.paidBy as PaidBy }),
      ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
    include: expenseInclude,
  });
}

export async function deleteExpense(id: number) {
  await getExpenseById(id);
  return prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getExpensesSummary(propertyId: number, year: number, month: number) {
  const expenses = await prisma.expense.findMany({
    where: { propertyId, periodYear: year, periodMonth: month, deletedAt: null },
  });

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byPaidBy = {
    AGENCY: expenses.filter((e) => e.paidBy === 'AGENCY').reduce((s, e) => s + e.amount, 0),
    OWNER: expenses.filter((e) => e.paidBy === 'OWNER').reduce((s, e) => s + e.amount, 0),
    TENANT: expenses.filter((e) => e.paidBy === 'TENANT').reduce((s, e) => s + e.amount, 0),
  };

  return { expenses, byCategory, total, byPaidBy };
}
