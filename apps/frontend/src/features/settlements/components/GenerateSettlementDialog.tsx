import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Grid, CircularProgress, Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useGenerateSettlement } from '../api/useSettlements';
import { useContracts } from '@/features/contracts/api/useContracts';

const MONTHS = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

const currentDate = new Date();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

interface FormValues {
  contractId: number;
  year: number;
  month: number;
  notes: string;
}

interface Props {
  defaultContractId?: number;
  onClose: () => void;
  onSuccess?: (settlementId: number) => void;
}

export default function GenerateSettlementDialog({ defaultContractId, onClose, onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      contractId: defaultContractId,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      notes: '',
    },
  });

  const generate = useGenerateSettlement();
  const { data: contractsData } = useContracts({ status: 'ACTIVE', limit: 200 });

  const onSubmit = async (values: FormValues) => {
    const settlement = await generate.mutateAsync({
      contractId: Number(values.contractId),
      year: Number(values.year),
      month: Number(values.month),
      notes: values.notes || undefined,
    });
    onSuccess?.(settlement.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generar liquidación</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Se calculará automáticamente con los cobros recibidos y los gastos de la inmobiliaria del período.
          </Typography>
          <Grid container spacing={2}>
            {!defaultContractId && (
              <Grid item xs={12}>
                <TextField
                  select
                  label="Contrato *"
                  fullWidth
                  defaultValue=""
                  {...register('contractId', { required: true })}
                  error={!!errors.contractId}
                >
                  {contractsData?.data.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.property.street} {c.property.number}, {c.property.city}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Mes *"
                fullWidth
                defaultValue={currentDate.getMonth() + 1}
                {...register('month', { required: true })}
              >
                {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Año *"
                fullWidth
                defaultValue={currentDate.getFullYear()}
                {...register('year', { required: true })}
              >
                {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notas (opcional)"
                fullWidth
                multiline
                rows={2}
                {...register('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={generate.isPending}
            startIcon={generate.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Generar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
