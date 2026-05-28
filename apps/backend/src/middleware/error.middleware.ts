import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    details: env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Endpoint no encontrado', code: 'NOT_FOUND' });
}
