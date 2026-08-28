import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Settlement } from '../api/useSettlements';

export default function SettlementPropertiesTable({ settlement }: { settlement: Settlement }) {
  const formatMoney = (n: number) =>
    settlement.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  if (settlement.properties.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin propiedades alquiladas con contrato activo este período.
      </Typography>
    );
  }

  return (
    <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ '& th': { fontWeight: 600 } }}>
          <TableCell>Propiedad</TableCell>
          <TableCell align="right">% Participación</TableCell>
          <TableCell align="right">Cobrado</TableCell>
          <TableCell align="right">Comisión</TableCell>
          <TableCell align="right">Gastos</TableCell>
          <TableCell align="right">Subtotal</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {settlement.properties.map((sp) => (
          <TableRow key={sp.id}>
            <TableCell>
              <Typography variant="body2">{sp.property.street} {sp.property.number}</Typography>
              <Typography variant="caption" color="text.secondary">{sp.property.city}</Typography>
            </TableCell>
            <TableCell align="right">{sp.sharePercentage < 100 ? `${sp.sharePercentage}%` : '—'}</TableCell>
            <TableCell align="right">{sp.rentCollected > 0 ? formatMoney(sp.rentCollected) : '— pendiente'}</TableCell>
            <TableCell align="right" sx={{ color: sp.commissionAmount > 0 ? 'error.main' : 'text.disabled' }}>
              {sp.commissionAmount > 0 ? `-${formatMoney(sp.commissionAmount)}` : '—'}
            </TableCell>
            <TableCell align="right" sx={{ color: sp.expensesAmount > 0 ? 'error.main' : 'text.disabled' }}>
              {sp.expensesAmount > 0 ? `-${formatMoney(sp.expensesAmount)}` : '—'}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>{formatMoney(sp.subtotal)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </TableContainer>
  );
}
