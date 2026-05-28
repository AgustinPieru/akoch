import { Request, Response } from 'express';
import * as authService from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: 'Refresh token no encontrado', code: 'MISSING_REFRESH_TOKEN' });
      return;
    }
    const result = await authService.refreshAccessToken(token);
    res.json(result);
  } catch (err: any) {
    res.clearCookie(REFRESH_COOKIE);
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE);
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await authService.getMe(req.userId!);
    res.json(user);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
