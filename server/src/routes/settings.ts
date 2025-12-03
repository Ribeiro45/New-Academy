import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/roles';

const router = Router();

// Get all settings (public read)
router.get('/', async (req, res: Response) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    
    // Convert to key-value object
    const result: Record<string, any> = {};
    settings.forEach(s => {
      result[s.settingKey] = s.settingValue;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get setting by key (public)
router.get('/:key', async (req, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await prisma.siteSetting.findUnique({
      where: { settingKey: key },
    });

    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    res.json(setting.settingValue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Update or create setting (admin only)
router.put('/:key', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await prisma.siteSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: value },
      create: { settingKey: key, settingValue: value },
    });

    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Delete setting (admin only)
router.delete('/:key', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    await prisma.siteSetting.delete({
      where: { settingKey: key },
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

// Topic cards routes
router.get('/topic-cards/all', async (req, res: Response) => {
  try {
    const cards = await prisma.topicCard.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get topic cards' });
  }
});

router.post('/topic-cards', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, icon, color, linkUrl, orderIndex } = req.body;

    const card = await prisma.topicCard.create({
      data: {
        title,
        description,
        icon: icon || 'FileText',
        color: color || 'orange',
        linkUrl,
        orderIndex: orderIndex || 0,
      },
    });

    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create topic card' });
  }
});

router.put('/topic-cards/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, icon, color, linkUrl, orderIndex } = req.body;

    const card = await prisma.topicCard.update({
      where: { id },
      data: {
        title,
        description,
        icon,
        color,
        linkUrl,
        orderIndex,
      },
    });

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update topic card' });
  }
});

router.delete('/topic-cards/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.topicCard.delete({
      where: { id },
    });

    res.json({ message: 'Topic card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete topic card' });
  }
});

// User roles management (admin only)
router.get('/roles/all', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.userRole.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

router.post('/roles', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;

    // Check if role already exists
    const existing = await prisma.userRole.findFirst({
      where: { userId, role },
    });

    if (existing) {
      res.status(400).json({ error: 'Role already assigned' });
      return;
    }

    const userRole = await prisma.userRole.create({
      data: { userId, role },
    });

    res.status(201).json(userRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

router.delete('/roles/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.userRole.delete({
      where: { id },
    });

    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

export default router;
