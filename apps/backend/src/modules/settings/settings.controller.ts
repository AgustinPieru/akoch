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
