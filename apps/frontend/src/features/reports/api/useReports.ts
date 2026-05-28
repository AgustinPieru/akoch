import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface PaymentsPeriodSummary {
  total: number; paid: number; partial: number; pending: number; late: number;
  totalExpected: number; totalCollected: number; totalCommissions: number;
}

export interface PaymentsPeriodReport {
  year: number; month: number;
  summary: PaymentsPeriodSummary;
  payments: {
    id: number; periodYear: number; periodMonth: number;
    expectedAmount: number; paidAmount?: number;
    status: string; dueDate: string; paidAt?: string; paymentMethod?: string;
    contract: {
      currency: string; adminCommissionPct: number;
      property: { street: string; number: string; city: string };
      tenants: { isPrimary: boolean; tenant: { firstName?: string; lastName?: string; businessName?: string; type: string } }[];
    };
  }[];
}

export interface ActiveDebtPayment {
  id: number; periodYear: number; periodMonth: number;
  expectedAmount: number; paidAmount?: number;
  status: string; dueDate: string; daysOverdue: number; debtAmount: number;
  contract: {
    currency: string;
    property: { street: string; number: string; city: string };
    tenants: { tenant: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string } }[];
  };
}

export interface ActiveDebtReport {
  summary: { totalDebtors: number; totalAmount: number; lateCount: number; pendingCount: number; partialCount: number };
  payments: ActiveDebtPayment[];
}

export interface ExpiringContract {
  id: number; endDate: string; daysUntilExpiry: number;
  currentAmount: number; currency: string;
  property: {
    street: string; number: string; city: string;
    owners: { owner: { firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string; email?: string } }[];
  };
  tenants: { tenant: { firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string; email?: string } }[];
}

export interface ExpiringContractsReport {
  days: number;
  summary: { total: number; within15: number; within30: number; within60: number };
  contracts: ExpiringContract[];
}

export interface ExpensesPeriodReport {
  year: number; month?: number;
  summary: {
    total: number; totalAmount: number;
    byCategory: Record<string, number>;
    byPayer: { AGENCY: number; OWNER: number; TENANT: number };
  };
  expenses: {
    id: number; category: string; description: string;
    amount: number; currency: string; paidBy: string;
    date: string; periodYear: number; periodMonth?: number;
    property: { street: string; number: string; city: string };
  }[];
}

export function usePaymentsPeriodReport(year: number, month: number) {
  return useQuery<PaymentsPeriodReport>({
    queryKey: ['reports', 'payments-period', year, month],
    queryFn: () => api.get('/reports/payments-period', { params: { year, month } }).then((r) => r.data),
  });
}

export function useActiveDebtReport() {
  return useQuery<ActiveDebtReport>({
    queryKey: ['reports', 'active-debt'],
    queryFn: () => api.get('/reports/active-debt').then((r) => r.data),
  });
}

export function useExpiringContractsReport(days: number) {
  return useQuery<ExpiringContractsReport>({
    queryKey: ['reports', 'expiring-contracts', days],
    queryFn: () => api.get('/reports/expiring-contracts', { params: { days } }).then((r) => r.data),
  });
}

export function useExpensesPeriodReport(year: number, month?: number) {
  return useQuery<ExpensesPeriodReport>({
    queryKey: ['reports', 'expenses-period', year, month],
    queryFn: () => api.get('/reports/expenses-period', { params: { year, ...(month ? { month } : {}) } }).then((r) => r.data),
  });
}

// ─── Nuevos reportes ──────────────────────────────────────────────────────────

export interface ProfitabilityRow {
  property: { id: number; street: string; number: string; city: string; type: string };
  currency: string;
  grossIncome: number;
  commissions: number;
  expenses: number;
  netIncome: number;
}
export interface ProfitabilityReport {
  year: number;
  summary: { totalGross: number; totalCommissions: number; totalExpenses: number; totalNet: number };
  properties: ProfitabilityRow[];
}
export function useProfitabilityReport(year: number) {
  return useQuery<ProfitabilityReport>({
    queryKey: ['reports', 'profitability', year],
    queryFn: () => api.get('/reports/profitability', { params: { year } }).then((r) => r.data),
  });
}

export interface VacancyProperty {
  id: number; street: string; number: string; city: string; type: string; status: string;
  owners: { owner: { firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string } }[];
  contracts: { id: number; status: string; endDate: string; currentAmount: number; currency: string }[];
}
export interface VacancyReport {
  summary: { total: number; vacant: number; occupied: number; forSale: number; vacancyRate: string };
  properties: VacancyProperty[];
}
export function useVacancyReport() {
  return useQuery<VacancyReport>({
    queryKey: ['reports', 'vacancy'],
    queryFn: () => api.get('/reports/vacancy').then((r) => r.data),
  });
}

export interface AdjustmentRecord {
  id: number; appliedAt: string; percentage: number; previousAmount: number; newAmount: number;
  indexType: string; indexValue?: number; notes?: string;
  contract: {
    id: number; currency: string;
    property: { street: string; number: string; city: string };
    tenants: { tenant: { firstName?: string; lastName?: string; businessName?: string; type: string } }[];
  };
}
export interface AdjustmentsReport {
  year: number;
  summary: { total: number; avgPercentage: string; byIndex: Record<string, number> };
  adjustments: AdjustmentRecord[];
}
export function useAdjustmentsReport(year: number) {
  return useQuery<AdjustmentsReport>({
    queryKey: ['reports', 'adjustments', year],
    queryFn: () => api.get('/reports/adjustments', { params: { year } }).then((r) => r.data),
  });
}

export interface SettlementRecord {
  id: number; periodYear: number; periodMonth: number;
  status: string; rentCollected: number; commissionPct: number;
  commissionAmount: number; expensesAmount: number; netAmount: number; currency: string;
  property: {
    id: number; street: string; number: string; city: string;
    owners: { owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string } }[];
  };
}
export interface SettlementsReport {
  year: number;
  summary: { total: number; totalNet: number; totalCommissions: number };
  settlements: SettlementRecord[];
  byOwner: {
    owner: { id: number; firstName?: string | null; lastName?: string | null; businessName?: string | null; type: string };
    totalNet: number;
    totalCommissions: number;
    settlements: SettlementRecord[];
  }[];
}
export function useSettlementsReport(year: number, ownerId?: number) {
  return useQuery<SettlementsReport>({
    queryKey: ['reports', 'settlements', year, ownerId],
    queryFn: () => api.get('/reports/settlements', { params: { year, ...(ownerId ? { ownerId } : {}) } }).then((r) => r.data),
  });
}
