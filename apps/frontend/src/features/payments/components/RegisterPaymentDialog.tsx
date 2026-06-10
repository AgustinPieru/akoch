import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Grid, Typography, CircularProgress, Alert, Box, Divider,
} from '@mui/material';
import { CheckCircle, PictureAsPdf } from '@mui/icons-material';
import { useForm, useWatch, Controller } from 'react-hook-form';
import CurrencyField from '@/components/CurrencyField';
import api from '@/lib/axios';
import { Payment, useRegisterPayment } from '../api/usePayments';
import { fmtDate } from '@/lib/dateUtils';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const METHODS = [
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Otro' },
];

interface FormValues {
  paidAmount: number;
  paidAt: string;
  paymentMethod: string;
  receiptNumber: string;
  notes: string;
  interestRate: string;
}

interface Props {
  payment: Payment;
  onClose: () => void;
}

async function downloadReceipt(paymentId: number, year: number, month: number) {
  const response = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${paymentId}-${year}-${String(month).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function calcInterest(capital: number, annualRate: number, dueDate: string, paidAt: string): number {
  const due = new Date(dueDate);
  const paid = new Date(paidAt);
  const days = Math.max(0, Math.floor((paid.getTime() - due.getTime()) / 86400000));
  if (days <= 0 || annualRate <= 0) return 0;
  return capital * (annualRate / 365) * days;
}

export default function RegisterPaymentDialog({ payment, onClose }: Props) {
  const [registeredId, setRegisteredId] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const isAlreadyLate = payment.status === 'LATE';

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      paidAmount: payment.expectedAmount,
      paidAt: today,
      paymentMethod: 'TRANSFER',
      receiptNumber: '',
      notes: '',
      interestRate: '',
    },
  });

  const paidAtValue = useWatch({ control, name: 'paidAt', defaultValue: today });
  const interestRateValue = useWatch({ control, name: 'interestRate', defaultValue: '' });
  const paidAmountValue = useWatch({ control, name: 'paidAmount', defaultValue: payment.expectedAmount });

  const isLatePayment = isAlreadyLate || (paidAtValue && new Date(paidAtValue) > new Date(payment.dueDate));
  const rateNum = parseFloat(interestRateValue) || 0;
  const capital = Number(paidAmountValue) || Number(payment.expectedAmount);
  const previewInterest = isLatePayment && rateNum > 0
    ? calcInterest(capital, rateNum / 100, payment.dueDate, paidAtValue)
    : 0;

  const registerPayment = useRegisterPayment();

  const onSubmit = async (values: FormValues) => {
    const result = await registerPayment.mutateAsync({
      id: payment.id,
      data: {
        paidAmount: Number(values.paidAmount),
        paidAt: values.paidAt,
        paymentMethod: values.paymentMethod,
        receiptNumber: values.receiptNumber || undefined,
        notes: values.notes || undefined,
        interestRate: values.interestRate ? parseFloat(values.interestRate) / 100 : undefined,
      },
    });
    setRegisteredId(result.id ?? payment.id);
  };

  const currency = payment.contract.currency;
  const formatMoney = (n: number) =>
    currency === 'USD'
      ? `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  if (registeredId !== null) {
    return (
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Cobro registrado</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={2} gap={2}>
            <CheckCircle color="success" sx={{ fontSize: 56 }} />
            <Typography variant="h6" fontWeight={600}>
              {MONTHS[payment.periodMonth - 1]} {payment.periodYear} — registrado exitosamente
            </Typography>
            <Alert severity="success" sx={{ width: '100%' }}>
              El cobro fue confirmado. Podés descargar el recibo en PDF ahora o desde la tabla de cobros.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PictureAsPdf />}
            onClick={() => downloadReceipt(registeredId, payment.periodYear, payment.periodMonth)}
          >
            Descargar recibo PDF
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Registrar cobro — {MONTHS[payment.periodMonth - 1]} {payment.periodYear}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Monto esperado: <strong>{formatMoney(payment.expectedAmount)}</strong>
            {' · '}Vencía: <strong>{fmtDate(payment.dueDate)}</strong>
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="paidAmount"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <CurrencyField
                    label="Monto cobrado *"
                    fullWidth
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val === '' ? 0 : val)}
                    error={!!errors.paidAmount}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de cobro *"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('paidAt', { required: true })}
                error={!!errors.paidAt}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Medio de pago *"
                fullWidth
                defaultValue="TRANSFER"
                {...register('paymentMethod', { required: true })}
              >
                {METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="N° de recibo (opcional)"
                fullWidth
                {...register('receiptNumber')}
              />
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

            {isLatePayment && (
              <>
                <Grid item xs={12}>
                  <Divider><Typography variant="caption" color="error.main">Pago con mora</Typography></Divider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Tasa BNA anual (% opcional)"
                    type="number"
                    fullWidth
                    placeholder="ej: 60"
                    helperText="Tasa anual del Banco Nación para descubiertos"
                    inputProps={{ min: 0, max: 1000, step: 0.5 }}
                    {...register('interestRate')}
                  />
                </Grid>
                {previewInterest > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      <Typography variant="body2">
                        Interés calculado:<br />
                        <strong>{formatMoney(previewInterest)}</strong>
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={registerPayment.isPending}
            startIcon={registerPayment.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Confirmar cobro
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
