import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { db } from '@ihms/db';
import { users } from '@ihms/db/schema';
import { eq, and } from 'drizzle-orm';

export const userRouter = router({
  // Get current user profile
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.userId),
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }),

  // Update current user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.userId))
        .returning();

      return {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
      };
    }),

  // Admin: List all users in company
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(users.companyId, ctx.user.companyId)];

      if (!input.includeInactive) {
        conditions.push(eq(users.isActive, true));
      }

      const results = await db.query.users.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: (users, { asc }) => [asc(users.lastName), asc(users.firstName)],
      });

      return results.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      }));
    }),

  // Admin: Toggle user active status
  toggleActive: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent self-deactivation
      if (input.userId === ctx.user.userId && !input.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot deactivate your own account',
        });
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, input.userId), eq(users.companyId, ctx.user.companyId)),
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      return {
        id: updated.id,
        isActive: updated.isActive,
      };
    }),
});
