import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get all courses (with optional filtering by user type)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    let courses = await prisma.course.findMany({
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
        },
        courseAccess: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by user type if authenticated
    if (req.user) {
      const profile = await prisma.profile.findUnique({
        where: { id: req.userId },
      });

      if (profile?.userType) {
        courses = courses.filter(course => {
          if (course.courseTarget === 'both') return true;
          return course.courseTarget === profile.userType;
        });
      }
    }

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Get course by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
            quizzes: true,
          },
        },
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
        quizzes: {
          where: { isFinalExam: true },
        },
        courseAccess: true,
      },
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Create course (admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, thumbnailUrl, duration, courseTarget, totalModules, totalLessons } = req.body;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        thumbnailUrl,
        duration,
        courseTarget: courseTarget || 'both',
        totalModules,
        totalLessons,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnailUrl, duration, courseTarget, totalModules, totalLessons } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: {
        title,
        description,
        thumbnailUrl,
        duration,
        courseTarget,
        totalModules,
        totalLessons,
      },
    });

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.course.delete({
      where: { id },
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Manage course access
router.post('/:id/access', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userTypes } = req.body; // Array of user types

    // Delete existing access rules
    await prisma.courseAccess.deleteMany({
      where: { courseId: id },
    });

    // Create new access rules
    const accessRules = await prisma.courseAccess.createMany({
      data: userTypes.map((userType: string) => ({
        courseId: id,
        userType,
      })),
    });

    res.json({ message: 'Access rules updated', count: accessRules.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update access rules' });
  }
});

export default router;
