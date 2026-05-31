import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  Alert, List, ListItemText, Divider, ListItemButton,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
  MenuItem, TextField, Skeleton,
} from '@mui/material';
import {
  Home, People, Description, PersonPin,
  Warning, Schedule, AccountBalance, TrendingUp,
} from '@mui/icons-material';
import api from '@/lib/axios';
import { useAuth } from '@/features/auth/hooks/useAuthContext';
import { ROUTES } from '@/router/routes';
import AlertsPanel from '../components/AlertsPanel';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface TenantRef { firstName?: string; lastName?: string; businessName?: string; type: string }
interface PaymentItem {
  id: number; expectedAmount: number; dueDate: string; periodYear: number; periodMonth: number;
  contract: {
    id: number; currency: string;
    property: { id: number; street: string; number: string; city: string };
    tenants: { isPrimary: boolean; tenant: TenantRef }[];
  };
}
interface ContractExpiringItem {
  id: number; endDate: string;
  property: { id: number; street: string; number: string; city: string };
  tenants: { isPrimary: boolean; tenant: TenantRef }[];
}
interface DraftSettlementItem {
  id: number; periodYear: number; periodMonth: number; netAmount: number; currency: string;
  property: { street: string; number: string; city: string };
}
interface MonthEarning {
  month: number;
  rentCollected: number;
  commissionEarned: number;
  expensesTotal: number;
  paymentsCount: number;
}
interface EarningsData {
  year: number;
  months: MonthEarning[];
  totals: { rentCollected: number; commissionEarned: number; expensesTotal: number; paymentsCount: number };
}

interface DashboardStats {
  properties: { total: number; rented: number; available: number; byStatus: { status: string; count: number }[] };
  owners: { total: number };
  tenants: { total: number };
  contracts: { active: number };
  payments: {
    pendingThisMonth: { count: number; amount: number; items: PaymentItem[] };
    late: { count: number; amount: number; items: PaymentItem[] };
  };
  contractsExpiringSoon: ContractExpiringItem[];
  draftSettlements: DraftSettlementItem[];
  recentProperties: { id: number; street: string; number: string; city: string; status: string; type: string }[];
}

const PROPERTY_STATUS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  AVAILABLE: { label: 'Disponible', color: 'success' },
  RENTED: { label: 'Alquilada', color: 'info' },
  FOR_SALE: { label: 'En venta', color: 'warning' },
  SOLD: { label: 'Vendida', color: 'default' },
  UNDER_RENOVATION: { label: 'En refacción', color: 'warning' },
  BLOCKED: { label: 'Bloqueada', color: 'error' },
};

function StatCard({
  title, value, subtitle, icon, color, onClick,
}: {
  title: string; value: number | string; subtitle?: string;
  icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Box sx={{ color, opacity: 0.6, mt: 0.5 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function tenantName(t: TenantRef) {
  return t.type === 'PERSONA_JURIDICA'
    ? t.businessName || '—'
    : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';
}

function formatMoney(amount: number, currency = 'ARS') {
  return currency === 'USD'
    ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
    : `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [earningsYear, setEarningsYear] = useState(currentYear);

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ['dashboard-earnings', earningsYear],
    queryFn: () => api.get('/dashboard/earnings', { params: { year: earningsYear } }).then((r) => r.data),
  });

  const now = new Date();
  const monthLabel = MONTHS_SHORT[now.getMonth()];
  const currentMonth = now.getMonth(); // 0-indexed
  const maxCommission = earnings ? Math.max(...earnings.months.map((m) => m.commissionEarned), 1) : 1;
  const monthsWithData = earnings?.months.filter((m) => m.paymentsCount > 0) ?? [];
  const avgMonthly = monthsWithData.length > 0 ? earnings!.totals.commissionEarned / monthsWithData.length : 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Bienvenido, {user?.name}</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Typography>

      {error && <Alert severity="error">Error al cargar el dashboard</Alert>}

      <AlertsPanel />

      {isLoading && (
        <Grid container spacing={2} mb={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="65%" sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="45%" height={44} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {data && (
        <>
          {/* KPIs */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Propiedades" value={data.properties.total} icon={<Home />} color="primary.main" onClick={() => navigate(ROUTES.PROPERTIES)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Alquiladas" value={data.properties.rented} icon={<Home />} color="info.main" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Disponibles" value={data.properties.available} icon={<Home />} color="success.main" />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Contratos activos" value={data.contracts.active} icon={<Description />} color="secondary.main" onClick={() => navigate(ROUTES.CONTRACTS)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Propietarios" value={data.owners.total} icon={<People />} color="text.primary" onClick={() => navigate(ROUTES.OWNERS)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard title="Inquilinos" value={data.tenants.total} icon={<PersonPin />} color="text.primary" onClick={() => navigate(ROUTES.TENANTS)} />
            </Grid>
          </Grid>

          {/* Alertas del mes */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{ bgcolor: data.payments.pendingThisMonth.count > 0 ? 'warning.50' : 'background.paper', cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.PAYMENTS)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">Cobros pendientes {monthLabel}</Typography>
                      <Typography variant="h4" fontWeight={700} color={data.payments.pendingThisMonth.count > 0 ? 'warning.dark' : 'text.primary'}>
                        {data.payments.pendingThisMonth.count}
                      </Typography>
                      {data.payments.pendingThisMonth.count > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {formatMoney(data.payments.pendingThisMonth.amount, 'ARS')} esperados
                        </Typography>
                      )}
                    </Box>
                    <Schedule sx={{ color: 'warning.main', fontSize: 36, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{ bgcolor: data.payments.late.count > 0 ? 'error.50' : 'background.paper', cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.PAYMENTS)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">Cobros atrasados</Typography>
                      <Typography variant="h4" fontWeight={700} color={data.payments.late.count > 0 ? 'error.main' : 'text.primary'}>
                        {data.payments.late.count}
                      </Typography>
                      {data.payments.late.count > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {formatMoney(data.payments.late.amount, 'ARS')} en deuda
                        </Typography>
                      )}
                    </Box>
                    <Warning sx={{ color: 'error.main', fontSize: 36, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{ bgcolor: data.draftSettlements.length > 0 ? 'info.50' : 'background.paper', cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.SETTLEMENTS)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">Liquidaciones pendientes</Typography>
                      <Typography variant="h4" fontWeight={700} color={data.draftSettlements.length > 0 ? 'info.dark' : 'text.primary'}>
                        {data.draftSettlements.length}
                      </Typography>
                      {data.draftSettlements.length > 0 && (
                        <Typography variant="caption" color="text.secondary">sin enviar al propietario</Typography>
                      )}
                    </Box>
                    <AccountBalance sx={{ color: 'info.main', fontSize: 36, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Listas */}
          <Grid container spacing={3}>
            {/* Cobros pendientes del mes */}
            <Grid item xs={12} md={6}>
              <SectionCard title={`Cobros pendientes — ${monthLabel}`} icon={<Schedule color="warning" fontSize="small" />}>
                {data.payments.pendingThisMonth.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" py={1}>
                    Todos los cobros del mes están al día ✓
                  </Typography>
                ) : (
                  <List disablePadding>
                    {data.payments.pendingThisMonth.items.map((p, i) => {
                      const primary = p.contract.tenants[0]?.tenant;
                      return (
                        <Box key={p.id}>
                          {i > 0 && <Divider />}
                          <ListItemButton disableGutters sx={{ py: 0.75 }} onClick={() => navigate(ROUTES.CONTRACT_DETAIL(p.contract.id))}>
                            <ListItemText
                              primary={`${p.contract.property.street} ${p.contract.property.number}`}
                              secondary={primary ? tenantName(primary) : '—'}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Typography variant="body2" fontWeight={600} color="warning.dark">
                              {formatMoney(p.expectedAmount, p.contract.currency)}
                            </Typography>
                          </ListItemButton>
                        </Box>
                      );
                    })}
                  </List>
                )}
              </SectionCard>
            </Grid>

            {/* Contratos por vencer */}
            <Grid item xs={12} md={6}>
              <SectionCard title="Contratos por vencer (60 días)" icon={<Warning color="error" fontSize="small" />}>
                {data.contractsExpiringSoon.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" py={1}>
                    No hay contratos próximos a vencer.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {data.contractsExpiringSoon.map((c, i) => {
                      const primary = c.tenants[0]?.tenant;
                      const days = daysUntil(c.endDate);
                      return (
                        <Box key={c.id}>
                          {i > 0 && <Divider />}
                          <ListItemButton disableGutters sx={{ py: 0.75 }} onClick={() => navigate(ROUTES.CONTRACT_DETAIL(c.id))}>
                            <ListItemText
                              primary={`${c.property.street} ${c.property.number}, ${c.property.city}`}
                              secondary={primary ? tenantName(primary) : '—'}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Chip
                              label={`${days}d`}
                              size="small"
                              color={days <= 30 ? 'error' : 'warning'}
                            />
                          </ListItemButton>
                        </Box>
                      );
                    })}
                  </List>
                )}
              </SectionCard>
            </Grid>

            {/* Liquidaciones sin enviar */}
            {data.draftSettlements.length > 0 && (
              <Grid item xs={12} md={6}>
                <SectionCard title="Liquidaciones sin enviar" icon={<AccountBalance color="info" fontSize="small" />}>
                  <List disablePadding>
                    {data.draftSettlements.map((s, i) => (
                      <Box key={s.id}>
                        {i > 0 && <Divider />}
                        <ListItemButton disableGutters sx={{ py: 0.75 }} onClick={() => navigate(ROUTES.SETTLEMENT_DETAIL(s.id))}>
                          <ListItemText
                            primary={`${s.property.street} ${s.property.number}, ${s.property.city}`}
                            secondary={`${MONTHS_SHORT[s.periodMonth - 1]} ${s.periodYear}`}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {formatMoney(s.netAmount, s.currency)}
                          </Typography>
                        </ListItemButton>
                      </Box>
                    ))}
                  </List>
                </SectionCard>
              </Grid>
            )}

            {/* Estado de cartera */}
            <Grid item xs={12} md={data.draftSettlements.length > 0 ? 6 : 5}>
              <SectionCard title="Estado de cartera" icon={<Home color="primary" fontSize="small" />}>
                {data.properties.byStatus.map((item) => (
                  <Box key={item.status} display="flex" justifyContent="space-between" alignItems="center" py={0.75}>
                    <Typography variant="body2">{PROPERTY_STATUS[item.status]?.label || item.status}</Typography>
                    <Chip label={item.count} size="small" color={PROPERTY_STATUS[item.status]?.color || 'default'} variant="outlined" />
                  </Box>
                ))}
              </SectionCard>
            </Grid>

            {/* Propiedades recientes */}
            {data.draftSettlements.length === 0 && (
              <Grid item xs={12} md={7}>
                <SectionCard title="Propiedades recientes" icon={<Home color="action" fontSize="small" />}>
                  <List disablePadding>
                    {data.recentProperties.map((p, i) => (
                      <Box key={p.id}>
                        {i > 0 && <Divider />}
                        <ListItemButton disableGutters sx={{ py: 0.75 }} onClick={() => navigate(ROUTES.PROPERTY_DETAIL(p.id))}>
                          <ListItemText
                            primary={`${p.street} ${p.number}, ${p.city}`}
                            secondary={p.type.replace(/_/g, ' ')}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          <Chip
                            label={PROPERTY_STATUS[p.status]?.label || p.status}
                            color={PROPERTY_STATUS[p.status]?.color || 'default'}
                            size="small"
                          />
                        </ListItemButton>
                      </Box>
                    ))}
                    {data.recentProperties.length === 0 && (
                      <Typography variant="body2" color="text.secondary" py={1}>Sin propiedades aún.</Typography>
                    )}
                  </List>
                </SectionCard>
              </Grid>
            )}
          </Grid>

          {/* Ganancias */}
          {earnings && (
            <Box mt={3}>
              <Card>
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TrendingUp color="success" fontSize="small" />
                      <Typography variant="h6">Ganancias {earningsYear}</Typography>
                    </Box>
                    <Box display="flex" gap={3} alignItems="center">
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">Comisiones acum.</Typography>
                        <Typography variant="body1" fontWeight={700} color="success.main">
                          {formatMoney(earnings.totals.commissionEarned)}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">Gestionado acum.</Typography>
                        <Typography variant="body1" fontWeight={700}>
                          {formatMoney(earnings.totals.rentCollected)}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">Promedio mensual</Typography>
                        <Typography variant="body1" fontWeight={700} color="primary.main">
                          {formatMoney(avgMonthly)}
                        </Typography>
                      </Box>
                      <TextField
                        select size="small" value={earningsYear}
                        onChange={(e) => setEarningsYear(Number(e.target.value))}
                        sx={{ minWidth: 100 }}
                      >
                        {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </TextField>
                    </Box>
                  </Box>
                </CardContent>

                <Divider />

                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
                      <TableCell>Mes</TableCell>
                      <TableCell align="right">Cobrado</TableCell>
                      <TableCell align="right">Comisión</TableCell>
                      <TableCell align="right">Gastos adelantados</TableCell>
                      <TableCell align="right">Pagos</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>Comisión (relativa)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {earnings.months.map((m) => {
                      const isCurrent = m.month - 1 === currentMonth && earningsYear === currentYear;
                      const hasData = m.paymentsCount > 0;
                      const pct = maxCommission > 0 ? (m.commissionEarned / maxCommission) * 100 : 0;
                      return (
                        <TableRow
                          key={m.month}
                          sx={{ bgcolor: isCurrent ? 'primary.50' : 'inherit', opacity: !hasData ? 0.45 : 1 }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={isCurrent ? 700 : 400}>
                              {MONTHS_FULL[m.month - 1]}
                              {isCurrent && (
                                <Typography component="span" variant="caption" color="primary.main" ml={0.5}>(actual)</Typography>
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={hasData ? 'text.primary' : 'text.disabled'}>
                              {hasData ? formatMoney(m.rentCollected) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={hasData ? 600 : 400} color={hasData ? 'success.main' : 'text.disabled'}>
                              {hasData ? formatMoney(m.commissionEarned) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={m.expensesTotal > 0 ? 'warning.dark' : 'text.disabled'}>
                              {m.expensesTotal > 0 ? formatMoney(m.expensesTotal) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={hasData ? 'text.primary' : 'text.disabled'}>
                              {hasData ? m.paymentsCount : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {hasData && (
                              <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                  variant="determinate" value={pct}
                                  sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'grey.200',
                                    '& .MuiLinearProgress-bar': { bgcolor: 'success.main' } }}
                                />
                                <Typography variant="caption" color="text.secondary" minWidth={32} textAlign="right">
                                  {pct.toFixed(0)}%
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Divider />
                <Box px={2} py={1.5} display="flex" justifyContent="flex-end" gap={4}>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total gestionado</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatMoney(earnings.totals.rentCollected)}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total comisiones</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">{formatMoney(earnings.totals.commissionEarned)}</Typography>
                  </Box>
                  {earnings.totals.expensesTotal > 0 && (
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">Total gastos adelantados</Typography>
                      <Typography variant="body2" fontWeight={700} color="warning.dark">{formatMoney(earnings.totals.expensesTotal)}</Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
