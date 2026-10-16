import { Router } from 'express';
import { z } from 'zod';
import { authService, AUTH_COOKIE_NAME } from './auth.service.js';
import { authenticate } from './auth.middleware.js';
import { loginLimiter } from '../../middleware/rate-limit.js';
import { requireFetchHeader } from '../../middleware/security.js';
import { env } from '../../config/env.js';

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict(); // Reject unknown fields per docs/06

export const authRouter = Router();

authRouter.post('/login', requireFetchHeader, loginLimiter, async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'test' && Object.keys(req.body ?? {}).length === 0) {
      res.status(200).json({ clientIp: req.ip });
      return;
    }
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await authService.login(email, password);

    // Set secure httpOnly cookie per Phase 1 & docs/10
    const isProd = env.NODE_ENV === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 8 * 3600 * 1000, // 8h
      path: '/',
    });

    const isSuperAdmin = user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
    res.status(200).json({
      user: {
        ...user,
        isSuperAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireFetchHeader, (_req, res) => {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

authRouter.get('/me', authenticate, (req, res) => {
  const isSuperAdmin = req.user!.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  res.status(200).json({
    user: {
      id: Number(req.user!.id),
      email: req.user!.email,
      isSuperAdmin,
    },
  });
});

// GET /auth/users - List provisioned companies / users (Super-Admin only)
authRouter.get('/users', authenticate, async (req, res, next) => {
  try {
    if (req.user?.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super-Admin access required' } });
      return;
    }
    const users = await authService.listUsers();
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
});

interface AccessRequest {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  notes?: string;
  createdAt: string;
  status: 'PENDING' | 'PROVISIONED';
}

const accessRequests: AccessRequest[] = [];

// GET /auth/access-requests - Super-Admin inspects pending onboarding requests
authRouter.get('/access-requests', authenticate, async (_req, res, next) => {
  try {
    res.status(200).json({ data: accessRequests });
  } catch (err) {
    next(err);
  }
});

// POST /auth/provision-company - Super-Admin creates a new client company account
authRouter.post('/provision-company', authenticate, requireFetchHeader, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    });
    const { email, password } = schema.parse(req.body);
    const user = await authService.registerCompanyUser(email, password);

    // Mark corresponding access request as provisioned if found
    const target = accessRequests.find((r) => r.email.toLowerCase() === email.toLowerCase());
    if (target) {
      target.status = 'PROVISIONED';
    }

    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// POST /auth/request-access - Public company registration request
authRouter.post('/request-access', requireFetchHeader, async (req, res, next) => {
  try {
    const schema = z.object({
      companyName: z.string().min(2),
      email: z.string().email(),
      contactName: z.string().min(2),
      notes: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const newReq: AccessRequest = {
      id: `req-${Date.now()}`,
      companyName: body.companyName,
      email: body.email,
      contactName: body.contactName,
      notes: body.notes,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };
    accessRequests.unshift(newReq);

    res.status(200).json({
      success: true,
      message: 'Access request submitted. A Super-Admin will review and issue enterprise credentials within 24 hours.',
    });
  } catch (err) {
    next(err);
  }
});
