import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Chip, List, ListItemButton,
  ListItemText, Divider, Collapse, IconButton, Tooltip, Badge,
  CircularProgress,
} from '@mui/material';
import {
  Error as CriticalIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
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
    bgColor: '#fff5f5',
    textColor: '#c62828',
    icon: <CriticalIcon fontSize="small" />,
  },
  warning: {
    label: 'Advertencias',
    color: 'warning' as const,
    bgColor: '#fffde7',
    textColor: '#e65100',
    icon: <WarningIcon fontSize="small" />,
  },
  info: {
    label: 'Informativas',
    color: 'info' as const,
    bgColor: '#f3f8ff',
    textColor: '#1565c0',
    icon: <InfoIcon fontSize="small" />,
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

  if (alerts.length === 0) return null;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        display="flex" alignItems="center" gap={1}
        sx={{ cursor: 'pointer', py: 0.75, px: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ color: cfg.textColor, display: 'flex' }}>{cfg.icon}</Box>
        <Typography variant="subtitle2" sx={{ color: cfg.textColor, flex: 1 }}>
          {cfg.label}
        </Typography>
        <Chip label={alerts.length} size="small" color={cfg.color} />
        <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <List disablePadding dense sx={{ ml: 1 }}>
          {alerts.map((alert, i) => (
            <Box key={alert.id}>
              {i > 0 && <Divider />}
              <ListItemButton
                sx={{ py: 0.5, borderRadius: 1, bgcolor: cfg.bgColor, mb: 0.5 }}
                onClick={() => navigate(entityLink(alert.entityType, alert.entityId))}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" fontWeight={600} sx={{ color: cfg.textColor }}>
                        {alert.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {alert.message}
                    </Typography>
                  }
                />
              </ListItemButton>
            </Box>
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

export default function AlertsPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery<AlertsData>({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const totalAlerts = data ? data.summary.critical + data.summary.warning + data.summary.info : 0;

  if (isLoading) return <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>;
  if (!data || totalAlerts === 0) return null;

  const criticals = data.alerts.filter((a) => a.severity === 'critical');
  const warnings = data.alerts.filter((a) => a.severity === 'warning');
  const infos = data.alerts.filter((a) => a.severity === 'info');

  return (
    <Card
      sx={{
        mb: 3,
        border: data.summary.critical > 0 ? '1px solid' : undefined,
        borderColor: data.summary.critical > 0 ? 'error.light' : undefined,
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6">Panel de alertas</Typography>
            {data.summary.critical > 0 && (
              <Badge badgeContent={data.summary.critical} color="error">
                <CriticalIcon color="error" />
              </Badge>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {(['critical', 'warning', 'info'] as Severity[]).map((s) => {
              const count = data.summary[s];
              if (count === 0) return null;
              return (
                <Chip
                  key={s}
                  icon={SEVERITY_CONFIG[s].icon}
                  label={count}
                  size="small"
                  color={SEVERITY_CONFIG[s].color}
                  variant="outlined"
                />
              );
            })}
            <Tooltip title="Actualizar alertas">
              <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <AlertGroup severity="critical" alerts={criticals} />
        <AlertGroup severity="warning" alerts={warnings} />
        <AlertGroup severity="info" alerts={infos} />
      </CardContent>
    </Card>
  );
}
