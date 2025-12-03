import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin, checkRole } from '../middleware/roles';

const router = Router();

// Get my profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update my profile
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, birthDate, avatarUrl } = req.body;

    const profile = await prisma.profile.update({
      where: { id: req.userId },
      data: {
        fullName,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        avatarUrl,
      },
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all profiles (admin only)
router.get('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        user: {
          include: {
            roles: true,
            companyProfile: true,
          },
        },
      },
    });

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// Get profile by ID (admin or self)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdminUser = await checkRole(req.userId!, 'admin');

    if (id !== req.userId && !isAdminUser) {
      // Check if user is a leader and can view this profile
      const isLeader = await checkRole(req.userId!, 'lider');
      if (isLeader) {
        // Check if profile belongs to leader's group
        const leaderGroup = await prisma.group.findFirst({
          where: { leaderId: req.userId },
          include: {
            members: true,
          },
        });

        if (!leaderGroup || !leaderGroup.members.some(m => m.userId === id)) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      } else {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            roles: true,
            companyProfile: true,
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile by ID (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, birthDate, avatarUrl, userType } = req.body;

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        fullName,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        avatarUrl,
        userType,
      },
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete profile/user (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
