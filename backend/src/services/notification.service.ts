import { prisma } from '../lib/prisma';
import { pushToUser } from './notificationHub';

// Small helpers so notification payloads stay consistent across call sites. `data`
// is a denormalized snapshot the bell renders directly (see Notification model).
// Each created notification is also pushed live over SSE to the recipient.

export async function notifyNewFollower(
  recipientId: string,
  follower: { id: string; name: string | null; avatarUrl: string | null },
): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: recipientId,
      type: 'new_follower',
      data: { followerId: follower.id, name: follower.name, avatarUrl: follower.avatarUrl },
    },
  });
  pushToUser(recipientId, notification);
}

export async function notifyCollabInvite(
  recipientId: string,
  payload: { collaboratorId: string; noteId: string; noteTitle: string | null; fromName: string | null },
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId: recipientId, type: 'collab_invite', data: payload },
  });
  pushToUser(recipientId, notification);
}
