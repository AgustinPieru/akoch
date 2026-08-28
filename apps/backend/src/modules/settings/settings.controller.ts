import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './settings.service';

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settings = await service.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settings = await service.updateSettings(req.body);
    res.json(settings);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function uploadLogo(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo', code: 'VALIDATION_ERROR' });
      return;
    }
    const settings = await service.setLogo(req.file);
    res.json(settings);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
