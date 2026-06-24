import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { notifyNewFollower } from '../services/notification.service';

// Lightweight people search for invites/mentions. Matches name OR username and
// returns only public identity fields — never email, which would enable enumeration.
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true },
      take: 8,
      orderBy: { username: 'asc' },
    });

    return res.json({ users });
  } catch (error) {
    console.error('SearchUsers error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
};

// Public profile: identity + aggregate counts + whether the viewer follows them.
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, avatarUrl: true, bio: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [followerCount, followingCount, publishedCount, follow] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.publishedNote.count({ where: { ownerId: userId, visibility: 'public' } }),
      req.userId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: req.userId, followingId: userId } },
          })
        : Promise.resolve(null),
    ]);

    return res.json({
      profile: {
        ...user,
        followerCount,
        followingCount,
        publishedCount,
        isFollowing: !!follow,
        isSelf: req.userId === userId,
      },
    });
  } catch (error) {
    console.error('GetProfile error:', error);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

// Follow is immediate, no approval. Idempotent so a double-tap is harmless.
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id as string;
    if (targetId === req.userId) return res.status(400).json({ error: 'You cannot follow yourself' });

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Only notify on a genuinely new follow, so unfollow/refollow doesn't spam.
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.userId!, followingId: targetId } },
    });
    if (!existing) {
      await prisma.follow.create({ data: { followerId: req.userId!, followingId: targetId } });
      const me = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (me) await notifyNewFollower(targetId, me);
    }

    return res.json({ following: true });
  } catch (error) {
    console.error('FollowUser error:', error);
    return res.status(500).json({ error: 'Failed to follow user' });
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id as string;
    await prisma.follow.deleteMany({ where: { followerId: req.userId!, followingId: targetId } });
    return res.json({ following: false });
  } catch (error) {
    console.error('UnfollowUser error:', error);
    return res.status(500).json({ error: 'Failed to unfollow user' });
  }
};
