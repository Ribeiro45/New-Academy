import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

export const hasRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoles = req.user.roles;
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const isAdmin = hasRole(['admin']);
export const isEditor = hasRole(['admin', 'editor']);
export const isLeader = hasRole(['lider']);

export const isAdminOrLeader = hasRole(['admin', 'lider']);

export const checkRole = async (userId: string, role: string): Promise<boolean> => {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: role as any,
    },
  });
  return !!userRole;
};

export const isGroupLeader = async (userId: string, groupId: string): Promise<boolean> => {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      leaderId: userId,
    },
  });
  return !!group;
};

export const isInGroup = async (userId: string, groupId: string): Promise<boolean> => {
  const member = await prisma.groupMember.findFirst({
    where: {
      userId,
      groupId,
    },
  });
  return !!member;
};
