import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import CurrencyField from '@/components/CurrencyField';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Sale, SaleInput, SaleStage, useCreateSale, useUpdateSale } from '../api/useSales';

const STAGE_OPTIONS: { value: SaleStage; label: string }[] = [
  { value: 'PROSPECTING', label: 'Prospección' },
  { value: 'VISIT_SCHEDULED', label: 'Visita programada' },
  { value: 'OFFER_MADE', label: 'Oferta realizada' },
  { value: 'NEGOTIATING', label: 'Negociando' },
  { value: 'SIGNED', label: 'Firmado' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

interface Props {
  sale?: Sale | null;
  onClose: () => void;
}

export default function SaleFormDialog({ sale, onClose }: Props) {
  const isEdit = !!sale;
  const create = useCreateSale();
  const update = useUpdateSale();
  const loading = create.isPending || update.isPending;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties-select'],
    queryFn: () => api.get('/properties', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const { control, handleSubmit, reset } = useForm<SaleInput>({
    defaultValues: {
      propertyId: sale?.propertyId ?? 0,
      askingPrice: sale?.askingPrice ?? 0,
      currency: sale?.currency ?? 'USD',
      stage: sale?.stage ?? 'PROSPECTING',
      buyerName: sale?.buyerName ?? '',
      buyerPhone: sale?.buyerPhone ?? '',
      buyerEmail: sale?.buyerEmail ?? '',
      offerAmount: sale?.offerAmount ?? undefined,
      closingDate: sale?.closingDate ? sale.closingDate.slice(0, 10) : '',
      commissionPct: sale?.commissionPct ?? 3,
      notes: sale?.notes ?? '',
    },
  });

  useEffect(() => {
    if (sale) {
      reset({
        propertyId: sale.propertyId,
        askingPrice: sale.askingPrice,
        currency: sale.currency,
        stage: sale.stage,
        buyerName: sale.buyerName ?? '',
        buyerPhone: sale.buyerPhone ?? '',
        buyerEmail: sale.buyerEmail ?? '',
        offerAmount: sale.offerAmount ?? undefined,
        closingDate: sale.closingDate ? sale.closingDate.slice(0, 10) : '',
        commissionPct: sale.commissionPct,
        notes: sale.notes ?? '',
      });
    }
  }, [sale, reset]);

  const onSubmit = async (data: SaleInput) => {
    const payload = {
      ...data,
      askingPrice: Number(data.askingPrice),
      offerAmount: data.offerAmount ? Number(data.offerAmount) : undefined,
      commissionPct: Number(data.commissionPct),
      closingDate: data.closingDate || undefined,
    };
    if (isEdit && sale) {
      await update.mutateAsync({ id: sale.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Editar venta' : 'Nueva venta'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={12}>
              <Controller
                name="propertyId"
                control={control}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    size="small"
                    label="Propiedad *"
                    disabled={isEdit}
                  >
                    {(propertiesData ?? []).map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.street} {p.number} — {p.city}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Etapa">
                    {STAGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Moneda">
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="ARS">ARS</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <Controller
                name="commissionPct"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Comisión %" type="number" inputProps={{ min: 0, max: 100, step: '0.5' }} />
                )}
              />
            </Grid>

            <Grid item xs={6}>
              <Controller
                name="askingPrice"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <CurrencyField
                    fullWidth
                    size="small"
                    label="Precio pedido *"
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val === '' ? 0 : val)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={6}>
              <Controller
                name="offerAmount"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    fullWidth
                    size="small"
                    label="Oferta"
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val === '' ? undefined : val)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="buyerName"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Nombre comprador" />
                )}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <Controller
                name="buyerPhone"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Teléfono" />
                )}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <Controller
                name="closingDate"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Fecha cierre" type="date" InputLabelProps={{ shrink: true }} />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="buyerEmail"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Email comprador" type="email" />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Notas" multiline rows={2} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} /> : isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
