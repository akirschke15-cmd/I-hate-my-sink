import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from './auth';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'Password123',
    firstName: 'John',
    lastName: 'Doe',
    companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  };

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'PASSWORD123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'PasswordABC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid companyId format', () => {
    const result = registerSchema.safeParse({
      ...validData,
      companyId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty firstName', () => {
    const result = registerSchema.safeParse({
      ...validData,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });
});
