import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Chip, List, ListItemButton,
  ListItemText, Collapse, IconButton, Tooltip, Skeleton,
  alpha,
} from '@mui/material';
import {
  Error as CriticalIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  NotificationsNone as BellIcon,
} from '@mui/icons-material';
import api from '@/lib/axios';
import { ROUTES } from '@/router/routes';

type Severity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  severity: Severity;
  type: string;
  title: string;
  message: string;
  entityId: number;
  entityType: string;
}

interface AlertsData {
  summary: { critical: number; warning: number; info: number };
  alerts: Alert[];
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'Críticas',
    color: 'error' as const,
    borderColor: '#D32F2F',
    bgColor: '#fff5f5',
    chipBg: '#FFEBEE',
    textColor: '#B71C1C',
    icon: CriticalIcon,
  },
  warning: {
    label: 'Advertencias',
    color: 'warning' as const,
    borderColor: '#ED6C02',
    bgColor: '#fffde7',
    chipBg: '#FFF3E0',
    textColor: '#E65100',
    icon: WarningIcon,
  },
  info: {
    label: 'Informativas',
    color: 'info' as const,
    borderColor: '#0288D1',
    bgColor: '#f3f8ff',
    chipBg: '#E3F2FD',
    textColor: '#01579B',
    icon: InfoIcon,
  },
};

function entityLink(entityType: string, entityId: number) {
  if (entityType === 'contract') return ROUTES.CONTRACT_DETAIL(entityId);
  if (entityType === 'settlement') return ROUTES.SETTLEMENT_DETAIL(entityId);
  if (entityType === 'payment') return ROUTES.PAYMENTS;
  if (entityType === 'occupation') return ROUTES.OCCUPATION_DETAIL(entityId);
  return ROUTES.DASHBOARD;
}

function AlertGroup({ severity, alerts }: { severity: Severity; alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(severity === 'critical');
  const navigate = useNavigate();
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;

  if (alerts.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 1,
        border: '1px solid',
        borderColor: alpha(cfg.borderColor, 0.25),
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      {/* Group header */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1.5}
        py={1}
        sx={{
          bgcolor: alpha(cfg.borderColor, 0.06),
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: alpha(cfg.borderColor, 0.1) },
          transition: 'background-color 0.15s',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon sx={{ fontSize: 18, color: cfg.textColor }} />
        <Typography variant="subtitle2" sx={{ color: cfg.textColor, flex: 1, fontWeight: 600 }}>
          {cfg.label}
        </Typography>
        <Chip
          label={alerts.length}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: cfg.chipBg,
            color: cfg.textColor,
            border: `1px solid ${alpha(cfg.borderColor, 0.3)}`,
          }}
        />
        <IconButton size="small" sx={{ p: 0.25, color: cfg.textColor }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Alert items */}
      <Collapse in={expanded}>
        <List disablePadding dense>
          {alerts.map((alert, i) => (
            <ListItemButton
              key={alert.id}
              sx={{
                py: 0.75,
                px: 1.5,
                borderTop: i > 0 ? `1px solid ${alpha(cfg.borderColor, 0.12)}` : undefined,
                borderLeft: `3px solid ${cfg.borderColor}`,
                '&:hover': { bgcolor: alpha(cfg.borderColor, 0.05) },
                transition: 'background-color 0.15s',
              }}
              onClick={() => navigate(entityLink(alert.entityType, alert.entityId))}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} sx={{ color: cfg.textColor, lineHeight: 1.4 }}>
                    {alert.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {alert.message}
                  </Typography>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

function AlertsPanelSkeleton() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Skeleton variant="text" width={140} height={28} />
          <Box display="flex" gap={1}>
            <Skeleton variant="rounded" width={48} height={24} />
            <Skeleton variant="rounded" width={48} height={24} />
          </Box>
        </Box>
        <Skeleton variant="rounded" height={40} sx={{ mb: 1, borderRadius: 1.5 }} />
        <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1.5 }} />
      </CardContent>
    </Card>
  );
}

export default function AlertsPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery<AlertsData>({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <AlertsPanelSkeleton />;

  const totalAlerts = data ? data.summary.critical + data.summary.warning + data.summary.info : 0;
  if (!data || totalAlerts === 0) return null;

  const criticals = data.alerts.filter((a) => a.severity === 'critical');
  const warnings = data.alerts.filter((a) => a.severity === 'warning');
  const infos = data.alerts.filter((a) => a.severity === 'info');

  const hasCritical = data.summary.critical > 0;

  return (
    <Card
      sx={{
        mb: 3,
        borderColor: hasCritical ? 'error.light' : 'rgba(0,0,0,0.08)',
        ...(hasCritical && {
          boxShadow: '0 0 0 2px rgba(211,47,47,0.12)',
        }),
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: hasCritical ? 'error.50' : 'grey.100',
                color: hasCritical ? 'error.main' : 'text.secondary',
              }}
            >
              {hasCritical ? <CriticalIcon fontSize="small" /> : <BellIcon fontSize="small" />}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                Panel de alertas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} activa{totalAlerts !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={0.75}>
            {(['critical', 'warning', 'info'] as Severity[]).map((s) => {
              const count = data.summary[s];
              if (count === 0) return null;
              const cfg = SEVERITY_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <Chip
                  key={s}
                  icon={<Icon style={{ fontSize: 14 }} />}
                  label={count}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    bgcolor: cfg.chipBg,
                    color: cfg.textColor,
                    border: `1px solid ${alpha(cfg.borderColor, 0.3)}`,
                    '& .MuiChip-icon': { color: cfg.textColor },
                  }}
                />
              );
            })}
            <Tooltip title="Actualizar alertas">
              <IconButton
                size="small"
                onClick={() => refetch()}
                disabled={isFetching}
                sx={{
                  ml: 0.25,
                  animation: isFetching ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alert groups */}
        <AlertGroup severity="critical" alerts={criticals} />
        <AlertGroup severity="warning" alerts={warnings} />
        <AlertGroup severity="info" alerts={infos} />
      </CardContent>
    </Card>
  );
}
