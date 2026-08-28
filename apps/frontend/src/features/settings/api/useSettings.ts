import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Settings {
  id: number;
  autoAdjustEnabled: boolean;
  agencyName?: string;
  agencyCuit?: string;
  agencyAddress?: string;
  agencyPhone?: string;
  logoUrl?: string;
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
    mutationFn: (data: Partial<Pick<Settings, 'autoAdjustEnabled' | 'agencyName' | 'agencyCuit' | 'agencyAddress' | 'agencyPhone'>>) =>
      api.patch('/settings', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
