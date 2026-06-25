import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Guarantor {
  id: number;
  contractId: number;
  fullName: string;
  dni?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface GuarantorInput {
  fullName: string;
  dni?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function useGuarantors(contractId: number) {
  return useQuery<Guarantor[]>({
    queryKey: ['guarantors', contractId],
    queryFn: () => api.get(`/guarantors/contract/${contractId}`).then((r) => r.data),
    enabled: !!contractId,
  });
}

export function useCreateGuarantor(contractId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GuarantorInput) => api.post(`/guarantors/contract/${contractId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guarantors', contractId] }),
  });
}

export function useUpdateGuarantor(contractId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GuarantorInput }) =>
      api.patch(`/guarantors/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guarantors', contractId] }),
  });
}

export function useDeleteGuarantor(contractId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/guarantors/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guarantors', contractId] }),
  });
}
