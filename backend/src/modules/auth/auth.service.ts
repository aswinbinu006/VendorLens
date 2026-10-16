import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/error.js';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const AUTH_COOKIE_NAME = 'vrm_session';

export const authService = {
  async bootstrapAdmin(): Promise<void> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: env.ADMIN_EMAIL },
      });

      if (!existingUser) {
        // Bcrypt cost 12 per Phase 1 and docs/10 rules
        const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
        await prisma.user.create({
          data: {
            email: env.ADMIN_EMAIL,
            passwordHash,
          },
        });
        logger.info({ email: env.ADMIN_EMAIL }, 'Admin user bootstrapped successfully');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to bootstrap admin user');
    }
  },

  async login(email: string, password: string): Promise<{ token: string; user: { id: number; email: string; createdAt: Date } }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    }

    const payload: JwtPayload = {
      userId: user.id.toString(),
      email: user.email,
    };

    const token = this.generateToken(payload);

    return {
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  },

  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  },

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Session expired or invalid');
    }
  },

  async registerCompanyUser(email: string, password: string): Promise<{ id: number; email: string; createdAt: Date }> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'A company user with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
      },
    });
    return {
      id: Number(user.id),
      email: user.email,
      createdAt: user.createdAt,
    };
  },

  async listUsers(): Promise<Array<{ id: number; email: string; createdAt: Date }>> {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({ id: Number(u.id), email: u.email, createdAt: u.createdAt }));
  },
};
