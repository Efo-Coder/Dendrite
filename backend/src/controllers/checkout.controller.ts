import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PRICE_IDS: Record<string, string> = {
  writer: process.env.STRIPE_PRICE_WRITER ?? '',
  author: process.env.STRIPE_PRICE_AUTHOR ?? '',
};

const PLAN_NAMES: Record<string, string> = {
  writer: 'writer',
  author: 'author',
};

export async function createCheckoutSession(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { plan } = req.body as { plan: string };

  if (!plan || !PRICE_IDS[plan]) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    customer_email: user.stripeCustomerId ? undefined : user.email,
    customer: user.stripeCustomerId ?? undefined,
    client_reference_id: userId,
    metadata: { plan },
    success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/?canceled=1`,
  });

  res.json({ url: session.url });
}

export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    res.status(400).json({ error: 'Webhook signature invalid' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const plan = session.metadata?.plan;

    if (userId && plan && PLAN_NAMES[plan]) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: PLAN_NAMES[plan],
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        },
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { plan: 'free', stripeSubscriptionId: null },
    });
  }

  res.json({ received: true });
}
