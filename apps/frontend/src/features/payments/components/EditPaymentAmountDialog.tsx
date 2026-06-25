import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  InputAdornment, Alert, CircularProgress, Typography,
} from '@mui/material';
import CurrencyField from '@/components/CurrencyField';
import { Payment, useUpdatePaymentAmount } from '../api/usePayments';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface Props {
  payment: Payment;
  onClose: () => void;
}

export default function EditPaymentAmountDialog({ payment, onClose }: Props) {
  const update = useUpdatePaymentAmount();
  const [amount, setAmount] = useState<number | ''>(payment.expectedAmount);

  const handleSave = async () => {
    if (amount === '') return;
    try {
      await update.mutateAsync({ id: payment.id, expectedAmount: Number(amount) });
      onClose();
    } catch {
      // error shown inline
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Editar monto del período</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {MONTHS[payment.periodMonth - 1]} {payment.periodYear}
        </Typography>
        <CurrencyField
          label="Monto esperado"
          fullWidth
          autoFocus
          value={amount}
          onChange={setAmount}
          InputProps={{
            startAdornment: <InputAdornment position="start">{payment.contract.currency === 'USD' ? 'USD' : '$'}</InputAdornment>,
          }}
        />
        {update.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(update.error as any)?.response?.data?.error ?? 'Error al guardar el monto.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={amount === '' || update.isPending}
          startIcon={update.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
