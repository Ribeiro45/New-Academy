import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  mfaVerified?: boolean;
}

export const generateToken = (payload: JWTPayload, expiresIn: string = '7d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userId = decoded.userId;
    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles.map(r => r.role),
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { roles: true },
      });

      if (user) {
        req.userId = decoded.userId;
        req.user = {
          id: user.id,
          email: user.email,
          roles: user.roles.map(r => r.role),
        };
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
