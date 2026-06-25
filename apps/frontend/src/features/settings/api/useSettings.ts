import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Settings {
  id: number;
  autoAdjustEnabled: boolean;
  updatedAt: string;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<Settings, 'autoAdjustEnabled'>>) =>
      api.patch('/settings', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
