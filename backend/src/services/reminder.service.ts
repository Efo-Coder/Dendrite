import { prisma } from '../lib/prisma';
import { notifyReminder } from './notification.service';
import { sendReminderEmail } from './email.service';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

// Roll a fire time forward by its recurrence until it lands in the future. Looping
// (rather than a single step) keeps recurring reminders on track even if the poller
// was down and several occurrences were missed.
export function nextOccurrence(from: Date, recurrence: Recurrence): Date {
  const next = new Date(from);
  const now = Date.now();
  do {
    if (recurrence === 'daily') next.setDate(next.getDate() + 1);
    else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
    else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
    else return next; // 'none' — caller deletes instead
  } while (next.getTime() <= now);
  return next;
}

// Fire every reminder whose time has come: in-app notification + email, then delete
// one-offs and advance recurring ones. Called on an interval from index.ts.
export async function processDueReminders(): Promise<void> {
  const due = await prisma.reminder.findMany({
    where: { remindAt: { lte: new Date() } },
    include: {
      user: { select: { email: true } },
      note: { select: { title: true } },
    },
  });

  for (const reminder of due) {
    try {
      await notifyReminder(reminder.userId, {
        reminderId: reminder.id,
        noteId: reminder.noteId,
        noteTitle: reminder.note.title,
        description: reminder.description,
      });
      // Email is best-effort: a send failure must not block rescheduling/deletion,
      // otherwise a dead address would refire the same reminder every minute.
      try {
        await sendReminderEmail(reminder.user.email, {
          description: reminder.description,
          noteTitle: reminder.note.title,
        });
      } catch (err) {
        console.error(`Reminder email failed (${reminder.id}):`, err);
      }

      if (reminder.recurrence === 'none') {
        await prisma.reminder.delete({ where: { id: reminder.id } });
      } else {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { remindAt: nextOccurrence(reminder.remindAt, reminder.recurrence as Recurrence) },
        });
      }
    } catch (err) {
      console.error(`Reminder processing failed (${reminder.id}):`, err);
    }
  }
}
