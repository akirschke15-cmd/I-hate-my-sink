import bcrypt from 'bcryptjs';
import { db } from '@ihms/db';
import { users, companies } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getAccessTokenExpirySeconds,
  type TokenPayload,
} from './jwt';
import type { AuthTokens, UserProfile, RegisterInput, LoginInput } from '@ihms/shared';

const SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  input: RegisterInput
): Promise<AuthTokens & { user: UserProfile }> {
  // Check if company exists
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, input.companyId),
  });

  if (!company) {
    throw new AuthError('Company not found', 'COMPANY_NOT_FOUND');
  }

  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });

  if (existingUser) {
    throw new AuthError('Email already registered', 'EMAIL_EXISTS');
  }

  // Hash password and create user
  const passwordHash = await hashPassword(input.password);

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
  const refreshToken = signRefreshToken({ userId: newUser.id });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      companyId: newUser.companyId,
      companyName: company.name,
    },
  };
}

export async function loginUser(input: LoginInput): Promise<AuthTokens & { user: UserProfile }> {
  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });

  if (!user) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED');
  }

  // Verify password
  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Get company
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, user.companyId),
  });

  if (!company) {
    throw new AuthError('Company not found', 'COMPANY_NOT_FOUND');
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
  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      companyName: company.name,
    },
  };
}

export async function refreshUserToken(refreshToken: string): Promise<AuthTokens> {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED');
  }

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const newAccessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
}
