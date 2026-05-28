import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Grid, CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useCreateExpense, useUpdateExpense, Expense } from '../api/useExpenses';
import { useProperties } from '@/features/properties/api/useProperties';

const CATEGORIES = [
  { value: 'EXPENSAS', label: 'Expensas' },
  { value: 'ABL', label: 'ABL / Impuesto inmobiliario' },
  { value: 'GAS', label: 'Gas' },
  { value: 'ELECTRICIDAD', label: 'Electricidad' },
  { value: 'AGUA', label: 'Agua' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'SEGURO', label: 'Seguro' },
  { value: 'HONORARIOS', label: 'Honorarios' },
  { value: 'OTRO', label: 'Otro' },
];

const PAID_BY = [
  { value: 'AGENCY', label: 'Inmobiliaria (descuenta de liquidación)' },
  { value: 'OWNER', label: 'Propietario' },
  { value: 'TENANT', label: 'Inquilino' },
];

const CURRENCIES = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

interface FormValues {
  propertyId: number;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
  invoiceNumber: string;
  notes: string;
}

interface Props {
  expense?: Expense;
  defaultPropertyId?: number;
  onClose: () => void;
}

export default function ExpenseFormDialog({ expense, defaultPropertyId, onClose }: Props) {
  const isEdit = !!expense;
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: expense
      ? {
          propertyId: expense.propertyId,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          date: expense.date.split('T')[0],
          paidBy: expense.paidBy,
          invoiceNumber: expense.invoiceNumber || '',
          notes: expense.notes || '',
        }
      : {
          propertyId: defaultPropertyId,
          category: 'EXPENSAS',
          currency: 'ARS',
          paidBy: 'AGENCY',
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: '',
          notes: '',
        },
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { data: propertiesData } = useProperties({ limit: 200 });

  const isPending = createExpense.isPending || updateExpense.isPending;

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      amount: Number(values.amount),
      propertyId: Number(values.propertyId),
      invoiceNumber: values.invoiceNumber || undefined,
      notes: values.notes || undefined,
    };
    if (isEdit) {
      await updateExpense.mutateAsync({ id: expense.id, data: payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            {!defaultPropertyId && (
              <Grid item xs={12}>
                <TextField
                  select
                  label="Propiedad *"
                  fullWidth
                  defaultValue={defaultPropertyId || ''}
                  {...register('propertyId', { required: true })}
                  error={!!errors.propertyId}
                >
                  {propertiesData?.data.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.street} {p.number}, {p.city}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Categoría *"
                fullWidth
                defaultValue="EXPENSAS"
                {...register('category', { required: true })}
              >
                {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha *"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('date', { required: true })}
                error={!!errors.date}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descripción *"
                fullWidth
                {...register('description', { required: true })}
                error={!!errors.description}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Monto *"
                type="number"
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
                {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
                error={!!errors.amount}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Moneda"
                fullWidth
                defaultValue="ARS"
                {...register('currency')}
              >
                {CURRENCIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Pagado por"
                fullWidth
                defaultValue="AGENCY"
                {...register('paidBy')}
              >
                {PAID_BY.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="N° de factura / comprobante"
                fullWidth
                {...register('invoiceNumber')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Notas"
                fullWidth
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
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} /> : undefined}
          >
            {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
