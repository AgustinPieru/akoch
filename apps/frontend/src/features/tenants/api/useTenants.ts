import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Tenant {
  id: number;
  type: 'PERSONA_FISICA' | 'PERSONA_JURIDICA';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dni?: string;
  cuit?: string;
  birthDate?: string;
  address?: string;
  workAddress?: string;
  employer?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  employmentStatus?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
}

export interface TenantsResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useTenants(params?: Record<string, string | number>) {
  return useQuery<TenantsResponse>({
    queryKey: ['tenants', params],
    queryFn: () => api.get('/tenants', { params }).then((r) => r.data),
  });
}

export function useTenant(id: number) {
  return useQuery<Tenant>({
    queryKey: ['tenants', id],
    queryFn: () => api.get(`/tenants/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tenant>) => api.post('/tenants', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });
}

export function useUpdateTenant(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tenant>) => api.patch(`/tenants/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      qc.invalidateQueries({ queryKey: ['tenants', id] });
    },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tenants/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  });
}

export interface AccountStatementPayment {
  id: number; periodYear: number; periodMonth: number;
  expectedAmount: number; paidAmount?: number; interestAmount?: number;
  status: string; dueDate: string; paidAt?: string; paymentMethod?: string;
  receiptNumber?: string;
  contract: {
    id: number; currency: string; status: string;
    property: { street: string; number: string; city: string };
  };
}
export interface AccountStatement {
  tenant: Tenant;
  summary: {
    totalExpected: number; totalPaid: number; totalDebt: number;
    totalInterest: number; overdueCount: number; totalPayments: number;
  };
  payments: AccountStatementPayment[];
}

export function useTenantAccountStatement(id: number) {
  return useQuery<AccountStatement>({
    queryKey: ['tenants', id, 'account-statement'],
    queryFn: () => api.get(`/tenants/${id}/account-statement`).then((r) => r.data),
    enabled: !!id,
  });
}
