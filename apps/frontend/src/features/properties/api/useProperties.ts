import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface PropertyOwnerLink {
  owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string; cuit?: string };
  percentage: number;
}

export interface Property {
  id: number;
  type: string;
  street: string;
  number: string;
  floor?: string;
  apartment?: string;
  zipCode?: string;
  city: string;
  province: string;
  coveredSurface?: number;
  totalSurface?: number;
  rooms?: string;
  status: string;
  ablPaidBy: string;
  ordinaryExpensesPaidBy: string;
  extraordinaryExpensesPaidBy: string;
  gasPaidBy: string;
  electricityPaidBy: string;
  waterPaidBy: string;
  apiPaidBy: string;
  hasMortgage: boolean;
  hasLien: boolean;
  notes?: string;
  publishForRent: boolean;
  publishForSale: boolean;
  createdAt: string;
  owners: PropertyOwnerLink[];
}

export interface PropertiesResponse {
  data: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useProperties(params?: Record<string, string | number>) {
  return useQuery<PropertiesResponse>({
    queryKey: ['properties', params],
    queryFn: () => api.get('/properties', { params }).then((r) => r.data),
  });
}

export function useProperty(id: number) {
  return useQuery<Property>({
    queryKey: ['properties', id],
    queryFn: () => api.get(`/properties/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/properties', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useUpdateProperty(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Property>) => api.patch(`/properties/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['properties', id] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/properties/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}
