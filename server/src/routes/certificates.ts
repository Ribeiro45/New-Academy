import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin, checkRole } from '../middleware/roles';

const router = Router();

// Generate certificate number
const generateCertificateNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `CERT-${year}-${random}-${timestamp}`;
};

// Get my certificates
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.userId },
      include: {
        course: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get certificates' });
  }
});

// Get certificate by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        course: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!certificate) {
      res.status(404).json({ error: 'Certificate not found' });
      return;
    }

    // Check access
    const isAdminUser = await checkRole(req.userId!, 'admin');
    if (certificate.userId !== req.userId && !isAdminUser) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(certificate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get certificate' });
  }
});

// Verify certificate by number
router.get('/verify/:certificateNumber', async (req, res: Response) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        course: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!certificate) {
      res.status(404).json({ valid: false, error: 'Certificate not found' });
      return;
    }

    res.json({
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        courseName: certificate.course.title,
        studentName: certificate.user.profile?.fullName,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

// Check and issue certificate
router.post('/check-and-issue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;

    // Check if certificate already exists
    const existing = await prisma.certificate.findFirst({
      where: {
        userId: req.userId,
        courseId,
      },
    });

    if (existing) {
      res.json({ certificate: existing, alreadyExists: true });
      return;
    }

    // Check if user passed the final exam
    const finalExam = await prisma.quiz.findFirst({
      where: { courseId, isFinalExam: true },
    });

    if (finalExam) {
      const passedAttempt = await prisma.userQuizAttempt.findFirst({
        where: {
          userId: req.userId,
          quizId: finalExam.id,
          passed: true,
        },
      });

      if (!passedAttempt) {
        res.status(400).json({ error: 'Must pass final exam to receive certificate' });
        return;
      }
    }

    // Check if all lessons are completed
    const lessons = await prisma.lesson.findMany({
      where: { courseId },
    });

    const completedProgress = await prisma.userProgress.findMany({
      where: {
        userId: req.userId,
        lessonId: { in: lessons.map(l => l.id) },
        completed: true,
      },
    });

    if (completedProgress.length < lessons.length) {
      res.status(400).json({ error: 'Must complete all lessons to receive certificate' });
      return;
    }

    // Issue certificate
    const certificate = await prisma.certificate.create({
      data: {
        userId: req.userId!,
        courseId,
        certificateNumber: generateCertificateNumber(),
      },
      include: {
        course: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    res.status(201).json({ certificate, alreadyExists: false });
  } catch (error) {
    console.error('Issue certificate error:', error);
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

// Get all certificates (admin only)
router.get('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        course: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get certificates' });
  }
});

// Delete certificate (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.certificate.delete({
      where: { id },
    });

    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

export default router;
