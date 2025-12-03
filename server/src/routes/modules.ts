import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get modules by course
router.get('/course/:courseId', async (req, res: Response) => {
  try {
    const { courseId } = req.params;

    const modules = await prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
        quizzes: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

// Get module by ID
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!module) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    res.json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// Create module (admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, title, description, orderIndex } = req.body;

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        description,
        orderIndex,
      },
    });

    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Update module (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, orderIndex } = req.body;

    const module = await prisma.module.update({
      where: { id },
      data: {
        title,
        description,
        orderIndex,
      },
    });

    res.json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// Delete module (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.module.delete({
      where: { id },
    });

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router;
