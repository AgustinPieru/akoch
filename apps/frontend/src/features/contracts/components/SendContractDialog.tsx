import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  Alert, CircularProgress, Checkbox, FormControlLabel, Divider, TextField, IconButton,
} from '@mui/material';
import { Email, Add, Close, CheckCircle } from '@mui/icons-material';
import { Contract, SendContractEmailResult } from '../api/useContracts';
import { useSendContractEmail } from '../api/useContracts';
import { useGuarantors } from '../api/useGuarantors';

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  contract: Contract;
  onClose: () => void;
}

interface Recipient {
  key: string;
  label: string;
  email?: string;
}

function partyLabel(p: { type: string; firstName?: string; lastName?: string; businessName?: string }) {
  return p.type === 'PERSONA_JURIDICA'
    ? (p.businessName || '—')
    : [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
}

function RecipientGroup({
  title, recipients, selected, onToggle,
}: {
  title: string;
  recipients: Recipient[];
  selected: Set<string>;
  onToggle: (key: string, email: string) => void;
}) {
  if (recipients.length === 0) return null;
  return (
    <Box mb={2}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>{title}</Typography>
      {recipients.map((r) => (
        <Box key={r.key}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={r.email ? selected.has(r.key) : false}
                disabled={!r.email}
                onChange={() => r.email && onToggle(r.key, r.email)}
              />
            }
            label={
              <Typography variant="body2">
                {r.label}{' '}
                {r.email
                  ? <Typography component="span" variant="caption" color="text.secondary">({r.email})</Typography>
                  : <Typography component="span" variant="caption" color="warning.main">(sin email cargado)</Typography>}
              </Typography>
            }
          />
        </Box>
      ))}
    </Box>
  );
}

export default function SendContractDialog({ contract, onClose }: Props) {
  const { data: guarantors } = useGuarantors(contract.id);
  const sendEmail = useSendContractEmail();

  const tenantRecipients: Recipient[] = contract.tenants.map((ct) => ({
    key: `tenant-${ct.tenant.id}`,
    label: `${ct.isPrimary ? '★ ' : ''}${partyLabel(ct.tenant)}`,
    email: ct.tenant.email,
  }));
  const ownerRecipients: Recipient[] = contract.property.owners.map((po) => ({
    key: `owner-${po.owner.id}`,
    label: partyLabel(po.owner),
    email: po.owner.email,
  }));
  const guarantorRecipients: Recipient[] = (guarantors ?? []).map((g) => ({
    key: `guarantor-${g.id}`,
    label: g.fullName,
    email: g.email,
  }));

  const allRecipients = [...tenantRecipients, ...ownerRecipients, ...guarantorRecipients];
  const defaultSelected = new Set(allRecipients.filter((r) => r.email).map((r) => r.key));

  const [selected, setSelected] = useState<Set<string>>(defaultSelected);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [result, setResult] = useState<SendContractEmailResult | null>(null);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addExtraEmail = () => {
    const email = newEmail.trim();
    if (!email || extraEmails.includes(email)) return;
    setExtraEmails((prev) => [...prev, email]);
    setNewEmail('');
  };

  const emailsToSend = [
    ...allRecipients.filter((r) => r.email && selected.has(r.key)).map((r) => r.email as string),
    ...extraEmails,
  ];

  const handleSend = async () => {
    const res = await sendEmail.mutateAsync({ id: contract.id, emails: emailsToSend });
    setResult(res);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Enviar contrato por email</DialogTitle>
      <DialogContent dividers>
        {result ? (
          <>
            <Alert severity="success" icon={<CheckCircle />}>
              Contrato enviado a {result.emails.length} destinatario{result.emails.length !== 1 ? 's' : ''}.
            </Alert>
            {result.skipped.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {result.skipped.length} archivo{result.skipped.length !== 1 ? 's' : ''} no se incluyeron por superar el tamaño permitido para email:
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {result.skipped.map((s) => (
                    <li key={s.filename}><Typography variant="body2" component="span">{s.filename} ({formatBytes(s.sizeBytes)})</Typography></li>
                  ))}
                </Box>
                Podés compartirlos por WhatsApp o descargarlos desde la propiedad.
              </Alert>
            )}
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Se adjunta un resumen del contrato en PDF, junto con las fotos y videos de la propiedad y los documentos ya cargados al contrato
              (videos de hasta 15 MB; archivos más pesados no entran por email y te avisamos después de enviar).
            </Typography>

            <RecipientGroup title="Inquilinos" recipients={tenantRecipients} selected={selected} onToggle={toggle} />
            <RecipientGroup title="Propietario(s)" recipients={ownerRecipients} selected={selected} onToggle={toggle} />
            <RecipientGroup title="Garantes" recipients={guarantorRecipients} selected={selected} onToggle={toggle} />

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Agregar otro email</Typography>
            <Box display="flex" gap={1} mb={1}>
              <TextField
                size="small"
                type="email"
                placeholder="otro@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraEmail(); } }}
                fullWidth
              />
              <Button variant="outlined" onClick={addExtraEmail} startIcon={<Add />}>Agregar</Button>
            </Box>
            {extraEmails.map((email) => (
              <Box key={email} display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <Typography variant="body2">{email}</Typography>
                <IconButton size="small" onClick={() => setExtraEmails((prev) => prev.filter((e) => e !== email))}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}

            {sendEmail.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {(sendEmail.error as any)?.response?.data?.error ?? 'Error al enviar el email'}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button onClick={onClose} variant="contained">Cerrar</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={sendEmail.isPending}>Cancelar</Button>
            <Button
              variant="contained"
              startIcon={sendEmail.isPending ? <CircularProgress size={16} color="inherit" /> : <Email />}
              onClick={handleSend}
              disabled={sendEmail.isPending || emailsToSend.length === 0}
            >
              Enviar a {emailsToSend.length} destinatario{emailsToSend.length !== 1 ? 's' : ''}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
