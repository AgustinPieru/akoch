import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ContractTenantLink {
  isPrimary: boolean;
  tenant: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string; email?: string };
}

export interface Contract {
  id: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  initialAmount: number;
  currentAmount: number;
  currency: 'ARS' | 'USD';
  indexType: string;
  updateFrequency: string;
  freePercentage?: number;
  adminCommissionPct: number;
  initialCommission?: number;
  status: string;
  terminationDate?: string;
  terminationReason?: string;
  specialClauses?: string;
  lastAdjustmentDate?: string;
  nextAdjustmentDate?: string;
  createdAt: string;
  property: {
    id: number; street: string; number: string; city: string; status: string;
    owners: { owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string } }[];
  };
  tenants: ContractTenantLink[];
  adjustments: { id: number; appliedAt: string; previousAmount: number; newAmount: number; percentage: number; indexType: string }[];
}

export interface ContractsResponse {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useContracts(params?: Record<string, string | number>) {
  return useQuery<ContractsResponse>({
    queryKey: ['contracts', params],
    queryFn: () => api.get('/contracts', { params }).then((r) => r.data),
  });
}

export function useContract(id: number) {
  return useQuery<Contract>({
    queryKey: ['contracts', id],
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/contracts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.patch(`/contracts/${id}`, data).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['contracts', id] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useActivateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/contracts/${id}/activate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useAdjustContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.post(`/contracts/${id}/adjust`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useTerminateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/contracts/${id}/terminate`, { reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useRenewContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.post(`/contracts/${id}/renew`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });
}

export function useFinalizeContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/contracts/${id}/finalize`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });
}
