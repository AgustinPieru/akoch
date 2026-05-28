import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';

function generateAccessToken(userId: number, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function getRefreshTokenExpiry(): Date {
  const days = parseInt(env.REFRESH_TOKEN_EXPIRES_IN) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw { status: 401, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { status: 401, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' };
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refreshAccessToken(token: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw { status: 401, message: 'Refresh token inválido o expirado', code: 'INVALID_REFRESH_TOKEN' };
  }

  const accessToken = generateAccessToken(stored.user.id, stored.user.role);
  return { accessToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) {
    throw { status: 404, message: 'Usuario no encontrado', code: 'NOT_FOUND' };
  }
  return user;
}
