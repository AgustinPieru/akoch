import { Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import { Settlement } from '../api/useSettlements';

function formatMoneyFor(settlement: Settlement, n: number) {
  return settlement.currency === 'USD'
    ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function SummaryRow({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <TableRow>
      <TableCell sx={{ fontWeight: highlight ? 700 : 400, borderBottom: highlight ? '2px solid' : undefined }}>
        {label}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          fontWeight: highlight ? 700 : 400,
          color: negative ? 'error.main' : highlight ? 'success.main' : 'text.primary',
          borderBottom: highlight ? '2px solid' : undefined,
        }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
}

export default function SettlementSummaryTable({ settlement }: { settlement: Settlement }) {
  const formatMoney = (n: number) => formatMoneyFor(settlement, n);
  return (
    <TableContainer>
    <Table size="small">
      <TableBody>
        <SummaryRow label="Alquiler cobrado" value={formatMoney(settlement.totalRent)} />
        <SummaryRow label="Comisión de administración" value={`−${formatMoney(settlement.totalCommission)}`} negative />
        {settlement.totalExpenses > 0 && (
          <SummaryRow label="Gastos descontados" value={`−${formatMoney(settlement.totalExpenses)}`} negative />
        )}
        {settlement.totalCharges > 0 && (
          <SummaryRow label="Impuestos, servicios y otros cargos" value={`−${formatMoney(settlement.totalCharges)}`} negative />
        )}
        <SummaryRow label="Neto a transferir" value={formatMoney(settlement.netAmount)} highlight />
      </TableBody>
    </Table>
    </TableContainer>
  );
}
