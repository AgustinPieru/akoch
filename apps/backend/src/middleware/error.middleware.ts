import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(err: Error & { status?: number; code?: string }, req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || 500;
  if (status >= 500) console.error('[ERROR]', err.stack);

  // Multer reporta archivos demasiado grandes con este código, sin status propio
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido (10 MB)', code: 'FILE_TOO_LARGE' });
    return;
  }

  res.status(status).json({
    error: status < 500 ? err.message : 'Error interno del servidor',
    code: err.code ?? 'INTERNAL_ERROR',
    details: env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Endpoint no encontrado', code: 'NOT_FOUND' });
}
