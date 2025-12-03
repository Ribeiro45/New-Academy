import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin, checkRole, isGroupLeader } from '../middleware/roles';

const router = Router();

// Get my progress
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        lesson: {
          include: {
            module: true,
            course: true,
          },
        },
      },
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get progress by course
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
    });

    const progress = await prisma.userProgress.findMany({
      where: {
        userId: req.userId,
        lessonId: { in: lessons.map(l => l.id) },
      },
    });

    const completedCount = progress.filter(p => p.completed).length;
    const totalLessons = lessons.length;
    const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    res.json({
      progress,
      completedCount,
      totalLessons,
      percentage,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Mark lesson as complete
router.post('/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.body;

    const existing = await prisma.userProgress.findFirst({
      where: {
        userId: req.userId,
        lessonId,
      },
    });

    if (existing) {
      const updated = await prisma.userProgress.update({
        where: { id: existing.id },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });
      res.json(updated);
      return;
    }

    const progress = await prisma.userProgress.create({
      data: {
        userId: req.userId!,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
    });

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Reset progress for a module (used when quiz fails)
router.delete('/module/:moduleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
    });

    await prisma.userProgress.deleteMany({
      where: {
        userId: req.userId,
        lessonId: { in: lessons.map(l => l.id) },
      },
    });

    res.json({ message: 'Progress reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// Get progress by user (admin or leader)
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const isAdminUser = await checkRole(req.userId!, 'admin');
    
    if (!isAdminUser) {
      // Check if leader
      const isLeaderUser = await checkRole(req.userId!, 'lider');
      if (isLeaderUser) {
        const leaderGroup = await prisma.group.findFirst({
          where: { leaderId: req.userId },
          include: { members: true },
        });

        if (!leaderGroup || !leaderGroup.members.some(m => m.userId === userId)) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      } else {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        lesson: {
          include: {
            module: true,
            course: true,
          },
        },
      },
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get all progress (admin only)
router.get('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await prisma.userProgress.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        lesson: {
          include: {
            module: true,
            course: true,
          },
        },
      },
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

export default router;
