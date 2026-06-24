import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { pickUsername } from '../services/username.service';

type OAuthTokenResponse = { access_token?: string };

const getJwtSecret = () => process.env.JWT_SECRET!;
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';
const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const getBackendUrl = () => process.env.BACKEND_URL || 'http://localhost:3000';

function callbackUrl(provider: string) {
  return `${getBackendUrl()}/api/auth/${provider}/callback`;
}

function buildState(provider: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ provider, nonce }, getJwtSecret(), { expiresIn: '10m' });
}

function verifyState(state: string | undefined, expectedProvider: string): boolean {
  if (!state) return false;
  try {
    const payload = jwt.verify(state, getJwtSecret()) as { provider?: string };
    return payload.provider === expectedProvider;
  } catch {
    return false;
  }
}

async function findOrCreateOAuthUser(data: {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { provider: data.provider, providerId: data.providerId },
  });
  if (existing) return existing;

  // Same email already registered → link the OAuth provider to that account
  const byEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        provider: data.provider,
        providerId: data.providerId,
        avatarUrl: byEmail.avatarUrl ?? data.avatarUrl ?? null,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name ?? null,
      username: await pickUsername(data.name ?? data.email),
      avatarUrl: data.avatarUrl ?? null,
      provider: data.provider,
      providerId: data.providerId,
      isVerified: true,
    },
  });
}

function redirectWithError(res: Response, message: string) {
  return res.redirect(`${getFrontendUrl()}/login?oauth_error=${encodeURIComponent(message)}`);
}

// ─── Google ──────────────────────────────────────────────────────────────────

export const redirectToGoogle = (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl('google'),
    response_type: 'code',
    scope: 'openid email profile',
    state: buildState('google'),
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error || !code || !verifyState(state, 'google')) {
    return redirectWithError(res, 'Google login failed');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl('google'),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
    if (!tokenData.access_token) return redirectWithError(res, 'Google login failed');

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!profile.email) return redirectWithError(res, 'Could not retrieve email from Google');

    const user = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: getJwtExpiresIn() as SignOptions['expiresIn'] });
    return res.redirect(`${getFrontendUrl()}/oauth/callback?token=${token}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    return redirectWithError(res, 'Google login failed');
  }
};

// ─── GitHub ───────────────────────────────────────────────────────────────────

export const redirectToGithub = (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: callbackUrl('github'),
    scope: 'user:email',
    state: buildState('github'),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

export const handleGithubCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error || !code || !verifyState(state, 'github')) {
    return redirectWithError(res, 'GitHub login failed');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl('github'),
      }),
    });
    const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
    if (!tokenData.access_token) return redirectWithError(res, 'GitHub login failed');

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Dendrite' },
    });
    const profile = (await userRes.json()) as {
      id: number;
      email: string | null;
      name: string | null;
      login: string;
      avatar_url?: string;
    };

    let email: string | null = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Dendrite' },
      });
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find(e => e.primary && e.verified);
      if (primary) email = primary.email;
    }

    if (!email) return redirectWithError(res, 'Could not retrieve email from GitHub');

    const user = await findOrCreateOAuthUser({
      provider: 'github',
      providerId: String(profile.id),
      email,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
    });

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: getJwtExpiresIn() as SignOptions['expiresIn'] });
    return res.redirect(`${getFrontendUrl()}/oauth/callback?token=${token}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    return redirectWithError(res, 'GitHub login failed');
  }
};

// ─── Microsoft ────────────────────────────────────────────────────────────────

export const redirectToMicrosoft = (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: callbackUrl('microsoft'),
    response_type: 'code',
    scope: 'openid email profile User.Read',
    state: buildState('microsoft'),
    response_mode: 'query',
  });
  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
};

export const handleMicrosoftCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error || !code || !verifyState(state, 'microsoft')) {
    return redirectWithError(res, 'Microsoft login failed');
  }

  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: callbackUrl('microsoft'),
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });
    const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
    if (!tokenData.access_token) return redirectWithError(res, 'Microsoft login failed');

    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userRes.json()) as {
      id: string;
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };

    const email = profile.mail || profile.userPrincipalName;
    if (!email) return redirectWithError(res, 'Could not retrieve email from Microsoft');

    const user = await findOrCreateOAuthUser({
      provider: 'microsoft',
      providerId: profile.id,
      email,
      name: profile.displayName,
    });

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: getJwtExpiresIn() as SignOptions['expiresIn'] });
    return res.redirect(`${getFrontendUrl()}/oauth/callback?token=${token}`);
  } catch (err) {
    console.error('Microsoft OAuth error:', err);
    return redirectWithError(res, 'Microsoft login failed');
  }
};
