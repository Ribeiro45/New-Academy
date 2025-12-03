import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get all FAQs (public)
router.get('/', async (req, res: Response) => {
  try {
    const { targetAudience } = req.query;

    const where = targetAudience ? { targetAudience: targetAudience as string } : {};

    const faqs = await prisma.faq.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });

    // Build hierarchy
    const sections = faqs.filter(f => f.isSection && !f.parentId);
    const result = sections.map(section => ({
      ...section,
      children: faqs.filter(f => f.parentId === section.id),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get FAQs' });
  }
});

// Get FAQ by ID
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await prisma.faq.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: { orderIndex: 'asc' },
        },
        parent: true,
      },
    });

    if (!faq) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }

    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get FAQ' });
  }
});

// Create FAQ (admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, parentId, isSection, orderIndex, targetAudience, pdfUrl, pdfPages } = req.body;

    const faq = await prisma.faq.create({
      data: {
        title,
        description,
        parentId,
        isSection: isSection || false,
        orderIndex: orderIndex || 0,
        targetAudience,
        pdfUrl,
        pdfPages,
      },
    });

    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// Update FAQ (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, parentId, isSection, orderIndex, targetAudience, pdfUrl, pdfPages } = req.body;

    const faq = await prisma.faq.update({
      where: { id },
      data: {
        title,
        description,
        parentId,
        isSection,
        orderIndex,
        targetAudience,
        pdfUrl,
        pdfPages,
      },
    });

    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// Delete FAQ (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.faq.delete({
      where: { id },
    });

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// Reorder FAQs (admin only)
router.post('/reorder', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body; // Array of { id, orderIndex }

    await Promise.all(
      items.map((item: { id: string; orderIndex: number }) =>
        prisma.faq.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    res.json({ message: 'Reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder FAQs' });
  }
});

export default router;
