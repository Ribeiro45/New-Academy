import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get lessons by module
router.get('/module/:moduleId', async (req, res: Response) => {
  try {
    const { moduleId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: 'asc' },
    });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lessons' });
  }
});

// Get lessons by course
router.get('/course/:courseId', async (req, res: Response) => {
  try {
    const { courseId } = req.params;

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
    });

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lessons' });
  }
});

// Get lesson by ID
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: true,
        course: true,
        quizzes: true,
      },
    });

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

// Create lesson (admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, moduleId, title, youtubeUrl, orderIndex, durationMinutes } = req.body;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        moduleId,
        title,
        youtubeUrl,
        orderIndex,
        durationMinutes,
      },
    });

    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update lesson (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, youtubeUrl, orderIndex, durationMinutes, moduleId } = req.body;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title,
        youtubeUrl,
        orderIndex,
        durationMinutes,
        moduleId,
      },
    });

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Delete lesson (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;
