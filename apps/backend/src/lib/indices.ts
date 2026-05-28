const ARGLY_BASE = 'https://api.argly.com.ar/v1';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AkochInmobiliaria/1.0)',
  'Accept': 'application/json',
};

async function fetchArgly<T>(path: string): Promise<T> {
  const url = `${ARGLY_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: FETCH_HEADERS });
  } catch (err: any) {
    throw new Error(`No se pudo conectar con api.argly.com.ar: ${err.message ?? err}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`api.argly.com.ar respondió con error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return res.json() as Promise<T>;
}

// ─── ICL ─────────────────────────────────────────────────────────────────────
// Response: { data: { fecha: string; valor: number } }
// "valor" es el porcentaje de variación acumulada del ICL (ej: 33.12 = 33.12%)

interface ArglyIclResponse {
  data: { fecha: string; valor: number };
}

export async function getICLValue(): Promise<{ fecha: string; valor: number }> {
  const body = await fetchArgly<ArglyIclResponse>('/icl');
  if (!body?.data?.valor) throw new Error('La API de ICL no devolvió datos válidos');
  return body.data;
}

// Mantiene la misma firma que antes para no romper llamadores existentes.
// Los parámetros de fecha son ignorados — la API solo expone el valor actual.
export async function getICLPercentage(
  _fromDate: Date,
  _toDate: Date,
): Promise<{ percentage: number; startValue?: number; endValue?: number }> {
  const { valor, fecha } = await getICLValue();
  return { percentage: valor, endValue: valor, startValue: undefined };
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
// Response: { data: { indice_ipc: number; mes: number; nombre_mes: string; anio: number; ... } }
// "indice_ipc" es la variación porcentual mensual del IPC (ej: 2.6 = 2.6%)

interface ArglyIpcResponse {
  data: {
    indice_ipc: number;
    mes: number;
    nombre_mes: string;
    anio: number;
    fecha_publicacion: string;
    fecha_proximo_informe: string;
  };
}

export async function getIPCValue(): Promise<ArglyIpcResponse['data']> {
  const body = await fetchArgly<ArglyIpcResponse>('/ipc');
  if (!body?.data?.indice_ipc) throw new Error('La API de IPC no devolvió datos válidos');
  return body.data;
}

// Mantiene la misma firma que antes.
// Los parámetros de fecha son ignorados — la API solo expone el último mes publicado.
export async function getIPCPercentage(
  _fromDate: Date,
  _toDate: Date,
): Promise<{ percentage: number; startValue?: number; endValue?: number }> {
  const { indice_ipc, nombre_mes, anio } = await getIPCValue();
  return { percentage: indice_ipc, endValue: indice_ipc, startValue: undefined };
}
