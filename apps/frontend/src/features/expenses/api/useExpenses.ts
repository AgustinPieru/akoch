import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Expense {
  id: number;
  propertyId: number;
  contractId?: number;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  periodYear: number;
  periodMonth: number;
  paidBy: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  property: { id: number; street: string; number: string; city: string };
  contract?: { id: number } | null;
}

export interface ExpensesResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useExpenses(params?: Record<string, string | number>) {
  return useQuery<ExpensesResponse>({
    queryKey: ['expenses', params],
    queryFn: () => api.get('/expenses', { params }).then((r) => r.data),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expenses', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.patch(`/expenses/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
