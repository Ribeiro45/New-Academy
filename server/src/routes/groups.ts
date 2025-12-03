import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin, isAdminOrLeader, checkRole, isGroupLeader } from '../middleware/roles';

const router = Router();

// Get my group (as member)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: req.userId },
      include: {
        group: {
          include: {
            leader: {
              include: {
                profile: true,
              },
            },
            members: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      res.status(404).json({ error: 'Not a member of any group' });
      return;
    }

    res.json(membership.group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Get group I lead (as leader)
router.get('/led', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const group = await prisma.group.findFirst({
      where: { leaderId: req.userId },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Not leading any group' });
      return;
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Get all groups (admin only)
router.get('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        leader: {
          include: {
            profile: true,
          },
        },
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Get group by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        leader: {
          include: {
            profile: true,
          },
        },
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check access
    const isAdminUser = await checkRole(req.userId!, 'admin');
    const isMember = group.members.some(m => m.userId === req.userId);
    const isLeader = group.leaderId === req.userId;

    if (!isAdminUser && !isMember && !isLeader) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Create group (admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, leaderId } = req.body;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        leaderId,
      },
      include: {
        leader: {
          include: {
            profile: true,
          },
        },
      },
    });

    // If leader is set, give them the leader role
    if (leaderId) {
      const existingRole = await prisma.userRole.findFirst({
        where: { userId: leaderId, role: 'lider' },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            userId: leaderId,
            role: 'lider',
          },
        });
      }
    }

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group (admin only)
router.put('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId } = req.body;

    const group = await prisma.group.update({
      where: { id },
      data: {
        name,
        description,
        leaderId,
      },
      include: {
        leader: {
          include: {
            profile: true,
          },
        },
        members: true,
      },
    });

    // Update leader role if changed
    if (leaderId) {
      const existingRole = await prisma.userRole.findFirst({
        where: { userId: leaderId, role: 'lider' },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            userId: leaderId,
            role: 'lider',
          },
        });
      }
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.group.delete({
      where: { id },
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Add member to group (admin only)
router.post('/:id/members', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId: id, userId },
    });

    if (existing) {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group (admin only)
router.delete('/:id/members/:userId', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    await prisma.groupMember.deleteMany({
      where: { groupId: id, userId },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Get group members progress (leader or admin)
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check access
    const isAdminUser = await checkRole(req.userId!, 'admin');
    const isLeader = await isGroupLeader(req.userId!, id);

    if (!isAdminUser && !isLeader) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
                progress: {
                  include: {
                    lesson: {
                      include: {
                        course: true,
                      },
                    },
                  },
                },
                certificates: {
                  include: {
                    course: true,
                  },
                },
                quizAttempts: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group.members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

export default router;
