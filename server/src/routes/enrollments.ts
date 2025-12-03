import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get my enrollments
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.userId },
      include: {
        course: {
          include: {
            modules: true,
            lessons: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Enroll in a course
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;

    // Check if already enrolled
    const existing = await prisma.enrollment.findFirst({
      where: {
        userId: req.userId,
        courseId,
      },
    });

    if (existing) {
      res.status(400).json({ error: 'Already enrolled in this course' });
      return;
    }

    // Check course access based on user type
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId },
    });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Check if user type has access
    if (course.courseTarget !== 'both' && course.courseTarget !== profile?.userType) {
      res.status(403).json({ error: 'No access to this course' });
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.userId!,
        courseId,
      },
      include: {
        course: true,
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Get all enrollments (admin only)
router.get('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        course: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Get enrollments by course (admin only)
router.get('/course/:courseId', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Delete enrollment (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.enrollment.delete({
      where: { id },
    });

    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

export default router;
