import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { loginSchema, registerSchema, refreshTokenSchema } from '@ihms/shared/schemas';
import { db } from '@ihms/db';
import { users, companies } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole, AuthTokens, UserProfile } from '@ihms/shared';
import { jwtConfig } from '../config/jwt';

const JWT_SECRET = jwtConfig.secret;
const JWT_REFRESH_SECRET = jwtConfig.refreshSecret;
const JWT_ACCESS_EXPIRY = jwtConfig.accessExpiry;
const JWT_REFRESH_EXPIRY = jwtConfig.refreshExpiry;
const SALT_ROUNDS = 12;

interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'] });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'] });
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return 15 * 60;
  }
}

export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    // Check if company exists
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, input.companyId),
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company not found',
      });
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Email already registered',
      });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        companyId: input.companyId,
        role: 'salesperson',
      })
      .returning();

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      companyId: newUser.companyId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(newUser.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseExpiry(JWT_ACCESS_EXPIRY),
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        companyId: newUser.companyId,
        companyName: company.name,
      } as UserProfile,
    };
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Account is disabled',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Get company
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user.companyId),
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company not found',
      });
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseExpiry(JWT_ACCESS_EXPIRY),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: company.name,
      } as UserProfile,
    };
  }),

  refresh: publicProcedure.input(refreshTokenSchema).mutation(async ({ input }) => {
    try {
      const payload = jwt.verify(input.refreshToken, JWT_REFRESH_SECRET) as { userId: string };

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found',
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Account is disabled',
        });
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      };

      const accessToken = signAccessToken(tokenPayload);
      const newRefreshToken = signRefreshToken(user.id);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: parseExpiry(JWT_ACCESS_EXPIRY),
      } as AuthTokens;
    } catch {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.userId),
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user.companyId),
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      companyName: company?.name || '',
    } as UserProfile;
  }),
});
