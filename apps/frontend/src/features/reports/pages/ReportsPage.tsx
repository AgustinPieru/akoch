import { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, TextField, MenuItem, CircularProgress, Alert, Grid, Card,
  CardContent, Divider,
} from '@mui/material';
import {
  usePaymentsPeriodReport,
  useActiveDebtReport,
  useExpiringContractsReport,
  useExpensesPeriodReport,
  useProfitabilityReport,
  useVacancyReport,
  useAdjustmentsReport,
  useSettlementsReport,
  ExpiringContract,
} from '../api/useReports';
import { useOwners } from '@/features/owners/api/useOwners';
import { fmtDate } from '@/lib/dateUtils';

const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  PAID: { label: 'Pagado', color: 'success' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
  PENDING: { label: 'Pendiente', color: 'default' },
  LATE: { label: 'Atrasado', color: 'error' },
};

const PAYER_LABELS: Record<string, string> = { AGENCY: 'Inmobiliaria', OWNER: 'Propietario', TENANT: 'Inquilino' };

const CATEGORY_LABELS: Record<string, string> = {
  ABL: 'ABL', EXPENSAS: 'Expensas', LUZ: 'Luz', GAS: 'Gas', AGUA: 'Agua',
  SEGURO: 'Seguro', REPARACION: 'Reparación', HONORARIOS: 'Honorarios', OTRO: 'Otro',
};

function formatMoney(n: number, currency = 'ARS') {
  return currency === 'USD'
    ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function tenantName(tenants: { tenant: { firstName?: string; lastName?: string; businessName?: string; type: string } }[]) {
  const t = tenants[0]?.tenant;
  if (!t) return '—';
  return t.type === 'PERSONA_JURIDICA' ? (t.businessName ?? '—') : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';
}

function ownerName(contract: ExpiringContract) {
  const o = contract.property.owners[0]?.owner;
  if (!o) return '—';
  return o.type === 'PERSONA_JURIDICA' ? (o.businessName ?? '—') : [o.firstName, o.lastName].filter(Boolean).join(' ') || '—';
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="h6" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

// ─── Tab 1: Cobros del período ─────────────────────────────────────────────────

function PaymentsPeriodTab() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const { data, isLoading, isError } = usePaymentsPeriodReport(year, month);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Mes" value={month}
          onChange={(e) => setMonth(Number(e.target.value))} sx={{ minWidth: 140 }}>
          {MONTHS_LONG.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Año" value={year}
          onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label="Total cobros" value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Cobrados" value={data.summary.paid} color="success.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Atrasados" value={data.summary.late} color="error.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Pendientes" value={data.summary.pending} color="text.secondary" /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Total esperado" value={formatMoney(data.summary.totalExpected)} /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Total cobrado" value={formatMoney(data.summary.totalCollected)} color="success.main" /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Comisiones generadas" value={formatMoney(data.summary.totalCommissions)} /></Grid>
          </Grid>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Inquilino</TableCell>
                  <TableCell>Propiedad</TableCell>
                  <TableCell align="right">Esperado</TableCell>
                  <TableCell align="right">Cobrado</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No hay cobros para este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.payments.map((p) => {
                    const st = PAYMENT_STATUS_CONFIG[p.status];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{tenantName(p.contract.tenants)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.contract.property.street} {p.contract.property.number}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.contract.property.city}</Typography>
                        </TableCell>
                        <TableCell align="right">{formatMoney(p.expectedAmount, p.contract.currency)}</TableCell>
                        <TableCell align="right">
                          {p.paidAmount != null ? formatMoney(p.paidAmount, p.contract.currency) : '—'}
                        </TableCell>
                        <TableCell>{fmtDate(p.dueDate)}</TableCell>
                        <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 2: Deuda activa ──────────────────────────────────────────────────────

function ActiveDebtTab() {
  const { data, isLoading, isError } = useActiveDebtReport();

  return (
    <Box mt={2}>
      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label="Deudores" value={data.summary.totalDebtors} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Atrasados" value={data.summary.lateCount} color="error.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Pendientes" value={data.summary.pendingCount} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Parciales" value={data.summary.partialCount} color="warning.main" /></Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label="Deuda total" value={formatMoney(data.summary.totalAmount)} color="error.main" />
            </Grid>
          </Grid>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Inquilino</TableCell>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell align="right">Deuda</TableCell>
                  <TableCell align="right">Días vencido</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Teléfono</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No hay deuda activa.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.payments.map((p) => {
                    const st = PAYMENT_STATUS_CONFIG[p.status];
                    const tenant = p.contract.tenants[0]?.tenant;
                    const tName = tenant
                      ? (tenant.type === 'PERSONA_JURIDICA' ? tenant.businessName : [tenant.firstName, tenant.lastName].filter(Boolean).join(' ')) || '—'
                      : '—';
                    return (
                      <TableRow key={p.id} sx={{ bgcolor: p.status === 'LATE' ? 'error.50' : undefined }}>
                        <TableCell>{tName}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.contract.property.street} {p.contract.property.number}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.contract.property.city}</Typography>
                        </TableCell>
                        <TableCell>{MONTHS_SHORT[p.periodMonth - 1]} {p.periodYear}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                          {formatMoney(p.debtAmount, p.contract.currency)}
                        </TableCell>
                        <TableCell align="right">
                          {p.daysOverdue > 0 ? (
                            <Typography variant="body2" color="error.main" fontWeight={600}>{p.daysOverdue}d</Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{tenant?.phone || '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 3: Contratos por vencer ──────────────────────────────────────────────

function ExpiringContractsTab() {
  const [days, setDays] = useState(60);
  const { data, isLoading, isError } = useExpiringContractsReport(days);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Horizonte" value={days}
          onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 160 }}>
          <MenuItem value={15}>Próximos 15 días</MenuItem>
          <MenuItem value={30}>Próximos 30 días</MenuItem>
          <MenuItem value={60}>Próximos 60 días</MenuItem>
          <MenuItem value={90}>Próximos 90 días</MenuItem>
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label={`Vencen en ${days}d`} value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Dentro de 15 días" value={data.summary.within15} color="error.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Dentro de 30 días" value={data.summary.within30} color="warning.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Dentro de 60 días" value={data.summary.within60} color="info.main" /></Grid>
          </Grid>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Inquilino</TableCell>
                  <TableCell>Propietario</TableCell>
                  <TableCell>Vence</TableCell>
                  <TableCell align="right">Días restantes</TableCell>
                  <TableCell align="right">Alquiler actual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No hay contratos próximos a vencer en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.contracts.map((c) => {
                    const urgencyColor = c.daysUntilExpiry <= 15 ? 'error' : c.daysUntilExpiry <= 30 ? 'warning' : 'info';
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Typography variant="body2">{c.property.street} {c.property.number}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.property.city}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{tenantName(c.tenants)}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.tenants[0]?.tenant.phone || ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{ownerName(c)}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.property.owners[0]?.owner.phone || ''}</Typography>
                        </TableCell>
                        <TableCell>{fmtDate(c.endDate)}</TableCell>
                        <TableCell align="right">
                          <Chip label={`${c.daysUntilExpiry}d`} color={urgencyColor} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatMoney(c.currentAmount, c.currency)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 4: Gastos del período ────────────────────────────────────────────────

function ExpensesPeriodTab() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>(currentMonth);
  const { data, isLoading, isError } = useExpensesPeriodReport(year, month || undefined);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Mes" value={month}
          onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todos los meses</MenuItem>
          {MONTHS_LONG.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Año" value={year}
          onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label="Total gastos" value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Monto total" value={formatMoney(data.summary.totalAmount)} color="error.main" /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="Inmobiliaria" value={formatMoney(data.summary.byPayer.AGENCY)} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="Propietario" value={formatMoney(data.summary.byPayer.OWNER)} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="Inquilino" value={formatMoney(data.summary.byPayer.TENANT)} /></Grid>
          </Grid>

          {Object.keys(data.summary.byCategory).length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Por categoría</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(data.summary.byCategory).map(([cat, amount]) => (
                  <Chip
                    key={cat}
                    label={`${CATEGORY_LABELS[cat] ?? cat}: ${formatMoney(amount)}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          )}

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Paga</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No hay gastos para este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{fmtDate(e.date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{e.property.street} {e.property.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.property.city}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={CATEGORY_LABELS[e.category] ?? e.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{e.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{PAYER_LABELS[e.paidBy] ?? e.paidBy}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatMoney(e.amount, e.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 5: Rentabilidad por propiedad ────────────────────────────────────────

function ProfitabilityTab() {
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError } = useProfitabilityReport(year);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Año" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>
      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}
      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label="Ingresos brutos" value={formatMoney(data.summary.totalGross)} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Comisiones" value={formatMoney(data.summary.totalCommissions)} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Gastos" value={formatMoney(data.summary.totalExpenses)} color="error.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Neto" value={formatMoney(data.summary.totalNet)} color="success.main" /></Grid>
          </Grid>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Propiedad</TableCell>
                  <TableCell align="right">Ingresos brutos</TableCell>
                  <TableCell align="right">Comisiones</TableCell>
                  <TableCell align="right">Gastos</TableCell>
                  <TableCell align="right">Neto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.properties.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin datos para este año.</TableCell></TableRow>
                ) : data.properties.map((row) => (
                  <TableRow key={row.property.id}>
                    <TableCell>
                      <Typography variant="body2">{row.property.street} {row.property.number}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.property.city}</Typography>
                    </TableCell>
                    <TableCell align="right">{formatMoney(row.grossIncome, row.currency)}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatMoney(row.commissions, row.currency)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{formatMoney(row.expenses, row.currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: row.netIncome >= 0 ? 'success.main' : 'error.main' }}>
                      {formatMoney(row.netIncome, row.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 6: Vacancia ──────────────────────────────────────────────────────────

const PROPERTY_STATUS_LABELS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  AVAILABLE: { label: 'Disponible', color: 'success' },
  RENTED: { label: 'Alquilada', color: 'info' },
  FOR_SALE: { label: 'En venta', color: 'warning' },
  SOLD: { label: 'Vendida', color: 'default' },
  OCCUPIED_WITHOUT_CONTRACT: { label: 'Ocupada sin contrato', color: 'error' },
  UNDER_RENOVATION: { label: 'En refacción', color: 'warning' },
  BLOCKED: { label: 'Bloqueada', color: 'default' },
};

function VacancyTab() {
  const { data, isLoading, isError } = useVacancyReport();

  return (
    <Box mt={2}>
      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}
      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><StatCard label="Total propiedades" value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Vacantes" value={data.summary.vacant} color="warning.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Ocupadas" value={data.summary.occupied} color="success.main" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Tasa de vacancia" value={`${data.summary.vacancyRate}%`} color={Number(data.summary.vacancyRate) > 20 ? 'error.main' : 'text.primary'} /></Grid>
          </Grid>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Propietario</TableCell>
                  <TableCell>Último contrato</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.properties.map((p) => {
                  const st = PROPERTY_STATUS_LABELS[p.status] ?? { label: p.status, color: 'default' as const };
                  const owner = p.owners[0]?.owner;
                  const ownerName = owner ? (owner.type === 'PERSONA_JURIDICA' ? owner.businessName : [owner.firstName, owner.lastName].filter(Boolean).join(' ')) ?? '—' : '—';
                  const lastContract = p.contracts[0];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Typography variant="body2">{p.street} {p.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.city}</Typography>
                      </TableCell>
                      <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                      <TableCell><Typography variant="body2">{ownerName}</Typography></TableCell>
                      <TableCell>
                        {lastContract ? (
                          <Typography variant="caption" color="text.secondary">
                            Venció {fmtDate(lastContract.endDate)}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 7: Historial de aumentos ─────────────────────────────────────────────

const INDEX_LABELS: Record<string, string> = {
  ICL_BCRA: 'ICL', IPC_INDEC: 'IPC', FREE: 'Libre', NONE: 'Sin ajuste',
};

function AdjustmentsTab() {
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError } = useAdjustmentsReport(year);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Año" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>
      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}
      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={4}><StatCard label="Total ajustes" value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Promedio aplicado" value={`${data.summary.avgPercentage}%`} /></Grid>
            {Object.entries(data.summary.byIndex).map(([idx, count]) => (
              <Grid item xs={6} sm={2} key={idx}><StatCard label={INDEX_LABELS[idx] ?? idx} value={count} /></Grid>
            ))}
          </Grid>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Inquilino</TableCell>
                  <TableCell>Índice</TableCell>
                  <TableCell align="right">Monto anterior</TableCell>
                  <TableCell align="right">Monto nuevo</TableCell>
                  <TableCell align="right">Variación</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.adjustments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin ajustes para este año.</TableCell></TableRow>
                ) : data.adjustments.map((adj) => {
                  const t = adj.contract.tenants[0]?.tenant;
                  const tName = t ? (t.type === 'PERSONA_JURIDICA' ? t.businessName : [t.firstName, t.lastName].filter(Boolean).join(' ')) ?? '—' : '—';
                  return (
                    <TableRow key={adj.id}>
                      <TableCell>{fmtDate(adj.appliedAt)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{adj.contract.property.street} {adj.contract.property.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{adj.contract.property.city}</Typography>
                      </TableCell>
                      <TableCell>{tName}</TableCell>
                      <TableCell><Chip label={INDEX_LABELS[adj.indexType] ?? adj.indexType} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">{formatMoney(adj.previousAmount, adj.contract.currency)}</TableCell>
                      <TableCell align="right">{formatMoney(adj.newAmount, adj.contract.currency)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>+{adj.percentage.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ─── Tab 8: Liquidaciones por propietario ─────────────────────────────────────

function SettlementsReportTab() {
  const [year, setYear] = useState(currentYear);
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const { data: ownersData } = useOwners({ limit: 200 });
  const { data, isLoading, isError } = useSettlementsReport(year, ownerId || undefined);

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} mt={2}>
        <TextField select size="small" label="Año" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Propietario" value={ownerId} onChange={(e) => setOwnerId(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 220 }}>
          <MenuItem value="">Todos</MenuItem>
          {(ownersData?.data ?? []).map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.type === 'PERSONA_JURIDICA' ? o.businessName : [o.firstName, o.lastName].filter(Boolean).join(' ')}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar el reporte.</Alert>}
      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={4}><StatCard label="Total liquidaciones" value={data.summary.total} /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Comisiones totales" value={formatMoney(data.summary.totalCommissions)} /></Grid>
            <Grid item xs={6} sm={4}><StatCard label="Neto transferido" value={formatMoney(data.summary.totalNet)} color="success.main" /></Grid>
          </Grid>
          {data.byOwner.map((ownerGroup) => {
            const name = ownerGroup.owner.type === 'PERSONA_JURIDICA'
              ? ownerGroup.owner.businessName ?? '—'
              : [ownerGroup.owner.firstName, ownerGroup.owner.lastName].filter(Boolean).join(' ') || '—';
            return (
              <Paper key={ownerGroup.owner.id} sx={{ mb: 2 }}>
                <Box px={2} pt={1.5} pb={0.5} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={700}>{name}</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={700}>
                    Neto: {formatMoney(ownerGroup.totalNet)}
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                      <TableCell>Período</TableCell>
                      <TableCell>Propiedad</TableCell>
                      <TableCell align="right">Alquiler cobrado</TableCell>
                      <TableCell align="right">Comisión</TableCell>
                      <TableCell align="right">Gastos</TableCell>
                      <TableCell align="right">Neto</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ownerGroup.settlements.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{MONTHS_SHORT[s.periodMonth - 1]} {s.periodYear}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.property.street} {s.property.number}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.property.city}</Typography>
                        </TableCell>
                        <TableCell align="right">{formatMoney(s.rentCollected, s.currency)}</TableCell>
                        <TableCell align="right">{formatMoney(s.commissionAmount, s.currency)}</TableCell>
                        <TableCell align="right">{formatMoney(s.expensesAmount, s.currency)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{formatMoney(s.netAmount, s.currency)}</TableCell>
                        <TableCell>
                          <Chip label={s.status === 'PAID' ? 'Pagada' : s.status === 'SENT' ? 'Enviada' : 'Borrador'}
                            color={s.status === 'PAID' ? 'success' : s.status === 'SENT' ? 'info' : 'default'} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            );
          })}
          {data.byOwner.length === 0 && (
            <Alert severity="info">No hay liquidaciones para el período seleccionado.</Alert>
          )}
        </>
      )}
    </Box>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: 'Cobros del período' },
    { label: 'Deuda activa' },
    { label: 'Contratos por vencer' },
    { label: 'Gastos del período' },
    { label: 'Rentabilidad' },
    { label: 'Vacancia' },
    { label: 'Aumentos' },
    { label: 'Liquidaciones' },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Reportes</Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
      </Paper>

      <Divider sx={{ display: 'none' }} />
      {tab === 0 && <PaymentsPeriodTab />}
      {tab === 1 && <ActiveDebtTab />}
      {tab === 2 && <ExpiringContractsTab />}
      {tab === 3 && <ExpensesPeriodTab />}
      {tab === 4 && <ProfitabilityTab />}
      {tab === 5 && <VacancyTab />}
      {tab === 6 && <AdjustmentsTab />}
      {tab === 7 && <SettlementsReportTab />}
    </Box>
  );
}
