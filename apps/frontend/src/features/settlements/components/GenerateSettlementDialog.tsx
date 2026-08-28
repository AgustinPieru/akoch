import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Grid, CircularProgress, Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useGenerateAllSettlements } from '../api/useSettlements';

const MONTHS = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

const currentDate = new Date();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

interface FormValues {
  year: number;
  month: number;
}

interface Props {
  onClose: () => void;
  onSuccess?: (year: number, month: number) => void;
}

export default function GenerateSettlementDialog({ onClose, onSuccess }: Props) {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    },
  });

  const generateAll = useGenerateAllSettlements();

  const onSubmit = async (values: FormValues) => {
    const year = Number(values.year);
    const month = Number(values.month);
    await generateAll.mutateAsync({ year, month });
    onSuccess?.(year, month);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generar liquidaciones del período</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Se genera automáticamente la liquidación de <strong>todos los propietarios</strong> con propiedades
            alquiladas, agrupando sus propiedades. Las que ya estén enviadas o pagadas para este período no se
            modifican.
          </Typography>
          <Grid container spacing={2}>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={generateAll.isPending}
            startIcon={generateAll.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Generar todas
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
