import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { quotes, users } from '@ihms/db/schema';
import { and, gte, lte, sql, eq } from 'drizzle-orm';
import { isAdmin } from '../../utils/rbac';

export const quotesAnalyticsRouter = router({
  // Get analytics summary
  getAnalytics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions: (ReturnType<typeof gte> | ReturnType<typeof eq>)[] = [
        eq(quotes.companyId, ctx.user.companyId),
      ];

      // If salesperson, filter by their own quotes only
      if (!isAdmin(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      if (input.startDate) {
        conditions.push(gte(quotes.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(quotes.createdAt, new Date(input.endDate)));
      }

      // Get all quotes for the period
      const allQuotes = await db
        .select({
          id: quotes.id,
          status: quotes.status,
          total: quotes.total,
          createdAt: quotes.createdAt,
          signedAt: quotes.signedAt,
        })
        .from(quotes)
        .where(and(...conditions));

      // Calculate counts by status
      const byStatus = {
        draft: 0,
        sent: 0,
        viewed: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      };

      let totalValue = 0;
      let acceptedValue = 0;
      let totalDaysToClose = 0;
      let closedCount = 0;

      for (const q of allQuotes) {
        byStatus[q.status as keyof typeof byStatus]++;
        const value = parseFloat(q.total);
        totalValue += value;

        if (q.status === 'accepted') {
          acceptedValue += value;
          if (q.signedAt && q.createdAt) {
            const days = Math.floor(
              (new Date(q.signedAt).getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            totalDaysToClose += days;
            closedCount++;
          }
        }
      }

      const totalQuotes = allQuotes.length;
      const decidedQuotes = byStatus.accepted + byStatus.rejected + byStatus.expired;
      const conversionRate = decidedQuotes > 0 ? byStatus.accepted / decidedQuotes : 0;
      const viewedQuotes = byStatus.viewed + byStatus.accepted + byStatus.rejected;
      const viewToAcceptRate = viewedQuotes > 0 ? byStatus.accepted / viewedQuotes : 0;

      return {
        totalQuotes,
        byStatus,
        conversionRate: Math.round(conversionRate * 100) / 100,
        viewToAcceptRate: Math.round(viewToAcceptRate * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        averageValue: totalQuotes > 0 ? Math.round((totalValue / totalQuotes) * 100) / 100 : 0,
        acceptedValue: Math.round(acceptedValue * 100) / 100,
        avgDaysToClose: closedCount > 0 ? Math.round(totalDaysToClose / closedCount) : 0,
      };
    }),

  // Get trend data for charts
  getTrends: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions: (ReturnType<typeof gte> | ReturnType<typeof eq> | ReturnType<typeof lte>)[] = [
        eq(quotes.companyId, ctx.user.companyId),
        gte(quotes.createdAt, new Date(input.startDate)),
        lte(quotes.createdAt, new Date(input.endDate)),
      ];

      // If salesperson, filter by their own quotes only
      if (!isAdmin(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const allQuotes = await db
        .select({
          status: quotes.status,
          total: quotes.total,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(and(...conditions))
        .orderBy(quotes.createdAt);

      // Group by period
      const trends: Map<
        string,
        { quotes: number; accepted: number; rejected: number; totalValue: number }
      > = new Map();

      for (const q of allQuotes) {
        const date = new Date(q.createdAt);
        let period: string;

        if (input.groupBy === 'day') {
          period = date.toISOString().split('T')[0];
        } else if (input.groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split('T')[0];
        } else {
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!trends.has(period)) {
          trends.set(period, { quotes: 0, accepted: 0, rejected: 0, totalValue: 0 });
        }

        const entry = trends.get(period)!;
        entry.quotes++;
        entry.totalValue += parseFloat(q.total);

        if (q.status === 'accepted') entry.accepted++;
        if (q.status === 'rejected') entry.rejected++;
      }

      return Array.from(trends.entries())
        .map(([period, data]) => ({
          period,
          ...data,
          totalValue: Math.round(data.totalValue * 100) / 100,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }),

  // Get sales rep performance (ADMIN ONLY)
  getRepPerformance: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // ADMIN ONLY - salespeople cannot view rep performance data
      if (!isAdmin(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can view sales rep performance data',
        });
      }

      const conditions: (ReturnType<typeof gte> | ReturnType<typeof eq> | ReturnType<typeof lte>)[] = [
        eq(quotes.companyId, ctx.user.companyId),
      ];

      if (input.startDate) {
        conditions.push(gte(quotes.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(quotes.createdAt, new Date(input.endDate)));
      }

      // Get quotes grouped by creator
      const quotesWithCreator = await db
        .select({
          createdById: quotes.createdById,
          status: quotes.status,
          total: quotes.total,
          createdAt: quotes.createdAt,
          signedAt: quotes.signedAt,
        })
        .from(quotes)
        .where(and(...conditions));

      // Get user info
      const userIds = [...new Set(quotesWithCreator.map((q) => q.createdById))];
      const usersData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(userIds.length > 0 ? sql`${users.id} IN ${userIds}` : sql`1=0`);

      const userMap = new Map(usersData.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

      // Aggregate by user
      const repStats: Map<
        string,
        {
          quotesCreated: number;
          quotesAccepted: number;
          totalValue: number;
          totalDaysToClose: number;
          closedCount: number;
        }
      > = new Map();

      for (const q of quotesWithCreator) {
        if (!repStats.has(q.createdById)) {
          repStats.set(q.createdById, {
            quotesCreated: 0,
            quotesAccepted: 0,
            totalValue: 0,
            totalDaysToClose: 0,
            closedCount: 0,
          });
        }

        const stats = repStats.get(q.createdById)!;
        stats.quotesCreated++;
        stats.totalValue += parseFloat(q.total);

        if (q.status === 'accepted') {
          stats.quotesAccepted++;
          if (q.signedAt && q.createdAt) {
            const days = Math.floor(
              (new Date(q.signedAt).getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            stats.totalDaysToClose += days;
            stats.closedCount++;
          }
        }
      }

      return Array.from(repStats.entries())
        .map(([userId, stats]) => ({
          userId,
          userName: userMap.get(userId) || 'Unknown',
          quotesCreated: stats.quotesCreated,
          quotesAccepted: stats.quotesAccepted,
          conversionRate:
            stats.quotesCreated > 0
              ? Math.round((stats.quotesAccepted / stats.quotesCreated) * 100) / 100
              : 0,
          totalValue: Math.round(stats.totalValue * 100) / 100,
          avgDaysToClose: stats.closedCount > 0 ? Math.round(stats.totalDaysToClose / stats.closedCount) : 0,
        }))
        .sort((a, b) => b.totalValue - a.totalValue);
    }),
});
