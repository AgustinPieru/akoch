import { Box, Typography, Chip, Button, CircularProgress } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { Contract, useSetCommissionInstallmentStatus } from '../api/useContracts';
import { fmtDate } from '@/lib/dateUtils';

interface Props {
  contract: Contract;
}

export default function CommissionInstallmentsSection({ contract }: Props) {
  const toggle = useSetCommissionInstallmentStatus(contract.id);

  const formatMoney = (n: number) =>
    contract.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const installments = contract.commissionInstallments;
  const totalAmount = installments.reduce((s, i) => s + Number(i.amount), 0);
  const paidAmount = installments.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.secondary">Honorarios</Typography>
        <Typography variant="body2" color="text.secondary">
          Cobrado <strong>{formatMoney(paidAmount)}</strong> de {formatMoney(totalAmount)}
        </Typography>
      </Box>

      {installments.map((inst) => (
        <Box
          key={inst.id}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          py={1}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="body2" fontWeight={500}>
              Cuota {inst.number}/{installments.length}
            </Typography>
            <Typography variant="body2">{formatMoney(inst.amount)}</Typography>
            <Chip
              size="small"
              label={inst.status === 'PAID' ? 'Pagada' : 'Pendiente'}
              color={inst.status === 'PAID' ? 'success' : 'default'}
            />
            {inst.status === 'PAID' && inst.paidAt && (
              <Typography variant="caption" color="text.secondary">{fmtDate(inst.paidAt)}</Typography>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            color={inst.status === 'PAID' ? 'inherit' : 'success'}
            startIcon={
              toggle.isPending && toggle.variables?.installmentId === inst.id
                ? <CircularProgress size={14} />
                : inst.status === 'PAID' ? <RadioButtonUnchecked fontSize="small" /> : <CheckCircle fontSize="small" />
            }
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ installmentId: inst.id, status: inst.status === 'PAID' ? 'PENDING' : 'PAID' })}
          >
            {inst.status === 'PAID' ? 'Marcar pendiente' : 'Marcar pagada'}
          </Button>
        </Box>
      ))}
    </Box>
  );
}
