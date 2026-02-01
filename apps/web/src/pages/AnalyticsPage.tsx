import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type DateRange = '7d' | '30d' | '90d' | 'all';

interface TrendData {
  period: string;
  quotes: number;
  accepted: number;
  rejected: number;
  totalValue: number;
}

interface RepPerformance {
  userId: string;
  userName: string;
  quotesCreated: number;
  quotesAccepted: number;
  conversionRate: number;
  totalValue: number;
  avgDaysToClose: number;
}

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const dateParams = useMemo(() => {
    const now = new Date();
    const endDate = now.toISOString();

    if (dateRange === 'all') {
      return {};
    }

    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    return { startDate, endDate };
  }, [dateRange]);

  const trendParams = useMemo(() => {
    const now = new Date();
    const endDate = now.toISOString();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const groupBy = dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week';

    return { startDate, endDate, groupBy: groupBy as 'day' | 'week' | 'month' };
  }, [dateRange]);

  const { data: analytics, isLoading: analyticsLoading } = trpc.quote.getAnalytics.useQuery(dateParams);
  const { data: trends, isLoading: trendsLoading } = trpc.quote.getTrends.useQuery(trendParams);
  const { data: repPerformance, isLoading: repsLoading } = trpc.quote.getRepPerformance.useQuery(dateParams);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Find max value for chart scaling
  const maxQuotes = trends ? Math.max(...trends.map((t: TrendData) => t.quotes), 1) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-primary-100 bg-white/80 shadow-soft backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-600">Track performance and trends</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Quotes Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Total Quotes</p>
              </div>
              {analyticsLoading ? (
                <div className="mt-3 h-10 w-20 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-3 text-4xl font-bold text-gray-900">{analytics?.totalQuotes || 0}</p>
              )}
            </div>
          </div>

          {/* Conversion Rate Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-green-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              </div>
              {analyticsLoading ? (
                <div className="mt-3 h-10 w-20 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-3 text-4xl font-bold text-green-600">
                  {formatPercent(analytics?.conversionRate || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Total Value Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
              </div>
              {analyticsLoading ? (
                <div className="mt-3 h-10 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-3 text-4xl font-bold text-gray-900">{formatCurrency(analytics?.totalValue || 0)}</p>
              )}
            </div>
          </div>

          {/* Avg Days to Close Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Avg. Days to Close</p>
              </div>
              {analyticsLoading ? (
                <div className="mt-3 h-10 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-3 text-4xl font-bold text-gray-900">{analytics?.avgDaysToClose || 0}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <div className="rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">Status Breakdown</h2>
            {analyticsLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: 'draft', label: 'Draft', color: 'bg-gray-400', dotColor: 'bg-gray-400' },
                  { key: 'sent', label: 'Sent', color: 'bg-blue-500', dotColor: 'bg-blue-500' },
                  { key: 'viewed', label: 'Viewed', color: 'bg-purple-500', dotColor: 'bg-purple-500' },
                  { key: 'accepted', label: 'Accepted', color: 'bg-green-500', dotColor: 'bg-green-500' },
                  { key: 'rejected', label: 'Rejected', color: 'bg-red-500', dotColor: 'bg-red-500' },
                  { key: 'expired', label: 'Expired', color: 'bg-yellow-500', dotColor: 'bg-yellow-500' },
                ].map(({ key, label, color, dotColor }) => {
                  const count = analytics?.byStatus[key as keyof typeof analytics.byStatus] || 0;
                  const total = analytics?.totalQuotes || 1;
                  const percent = (count / total) * 100;

                  return (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`}></div>
                          <span className="font-medium text-gray-700">{label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{count}</span>
                          <span className="text-gray-500">({Math.round(percent)}%)</span>
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 shadow-inner">
                        <div
                          className={`h-full ${color} shadow-sm transition-all duration-300`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trend Chart */}
          <div className="rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Quotes Over Time</h2>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-primary-200 shadow-sm" />
                  <span className="font-medium text-gray-600">Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-gradient-to-br from-green-400 to-green-600 shadow-sm" />
                  <span className="font-medium text-gray-600">Accepted</span>
                </div>
              </div>
            </div>
            {trendsLoading ? (
              <div className="rounded-lg bg-primary-50/30 p-4">
                <div className="flex h-48 items-end gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-full flex-1 animate-pulse rounded-t bg-gray-200" />
                  ))}
                </div>
              </div>
            ) : trends && trends.length > 0 ? (
              <>
                <div className="rounded-lg bg-primary-50/30 p-4">
                  <div className="flex h-48 items-end gap-1">
                    {trends.map((t: TrendData, i: number) => {
                      const height = (t.quotes / maxQuotes) * 100;
                      const acceptedHeight = (t.accepted / maxQuotes) * 100;

                      return (
                        <div
                          key={i}
                          className="group relative flex-1"
                          title={`${t.period}\nTotal: ${t.quotes}\nAccepted: ${t.accepted}\nRejected: ${t.rejected}`}
                        >
                          <div
                            className="absolute bottom-0 w-full rounded-t bg-primary-200 shadow-sm transition-all group-hover:bg-primary-300"
                            style={{ height: `${height}%` }}
                          />
                          <div
                            className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-green-500 to-green-400 shadow-sm transition-all group-hover:from-green-600 group-hover:to-green-500"
                            style={{ height: `${acceptedHeight}%` }}
                          />
                          {/* Tooltip on hover */}
                          <div className="absolute -top-20 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                            <div className="font-semibold">{t.period}</div>
                            <div className="mt-1 space-y-0.5 text-gray-300">
                              <div>Total: {t.quotes}</div>
                              <div>Accepted: {t.accepted}</div>
                              <div>Rejected: {t.rejected}</div>
                            </div>
                            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-xs text-gray-500">
                  <span className="font-medium">{trends[0]?.period}</span>
                  <span className="font-medium">{trends[trends.length - 1]?.period}</span>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-primary-50/30 text-gray-500">
                No data for selected period
              </div>
            )}
          </div>
        </div>

        {/* Rep Performance */}
        <div className="mt-6 rounded-2xl border border-primary-100/50 bg-white shadow-soft-lg">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Sales Rep Performance</h2>
          </div>
          {repsLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : repPerformance && repPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Quotes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Accepted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Conv. Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Avg. Days
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repPerformance.map((rep: RepPerformance) => (
                    <tr key={rep.userId} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                            {rep.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{rep.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                          {rep.quotesCreated}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700">
                          {rep.quotesAccepted}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${
                            rep.conversionRate >= 0.5
                              ? 'bg-green-50 text-green-700'
                              : rep.conversionRate >= 0.25
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {formatPercent(rep.conversionRate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatCurrency(rep.totalValue)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">{rep.avgDaysToClose || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-gray-500">No data for selected period</p>
          )}
        </div>

        {/* Additional Metrics */}
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Average Quote Value</p>
              {analyticsLoading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(analytics?.averageValue || 0)}</p>
              )}
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-green-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Accepted Value</p>
              {analyticsLoading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(analytics?.acceptedValue || 0)}</p>
              )}
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft-lg">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500 opacity-10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">View-to-Accept Rate</p>
              {analyticsLoading ? (
                <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-200" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatPercent(analytics?.viewToAcceptRate || 0)}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
