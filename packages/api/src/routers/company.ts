import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { db } from '@ihms/db';
import { companies } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';

export const companyRouter = router({
  // Get current company
  current: protectedProcedure.query(async ({ ctx }) => {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, ctx.user.companyId),
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company not found',
      });
    }

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      email: company.email,
      phone: company.phone,
      address: company.address,
      logoUrl: company.logoUrl,
    };
  }),

  // Admin: Update company settings
  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        address: z.string().max(500).optional(),
        logoUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(companies)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, ctx.user.companyId))
        .returning();

      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        logoUrl: updated.logoUrl,
      };
    }),
});
