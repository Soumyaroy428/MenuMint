import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateOwner, AuthenticatedRequest } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Both email and password are required.',
    });
    return;
  }

  const user = db.getUserByEmail(email.trim());
  if (!user) {
    res.status(401).json({
      error: 'Invalid Credentials',
      message: 'Invalid email or password.',
    });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      error: 'Invalid Credentials',
      message: 'Invalid email or password.',
    });
    return;
  }

  const cafe = db.getCafeById(user.cafeId);

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    cafeId: user.cafeId,
    role: user.role,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cafeId: user.cafeId,
      cafeName: cafe?.name || 'My Café',
      cafeSlug: cafe?.slug || '',
      currencySymbol: cafe?.currencySymbol || '$',
    },
  });
});

authRouter.get('/me', authenticateOwner, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const cafe = db.getCafeById(req.user.cafeId);

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      cafeId: req.user.cafeId,
      cafeName: cafe?.name || 'My Café',
      cafeSlug: cafe?.slug || '',
      currencySymbol: cafe?.currencySymbol || '$',
    },
  });
});

