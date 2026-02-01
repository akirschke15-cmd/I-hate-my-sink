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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Quotes</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-gray-900">{analytics?.totalQuotes || 0}</p>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-green-600">
                {formatPercent(analytics?.conversionRate || 0)}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Value</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(analytics?.totalValue || 0)}</p>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Avg. Days to Close</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-gray-900">{analytics?.avgDaysToClose || 0}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Status Breakdown</h2>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'draft', label: 'Draft', color: 'bg-gray-400' },
                  { key: 'sent', label: 'Sent', color: 'bg-blue-500' },
                  { key: 'viewed', label: 'Viewed', color: 'bg-purple-500' },
                  { key: 'accepted', label: 'Accepted', color: 'bg-green-500' },
                  { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
                  { key: 'expired', label: 'Expired', color: 'bg-yellow-500' },
                ].map(({ key, label, color }) => {
                  const count = analytics?.byStatus[key as keyof typeof analytics.byStatus] || 0;
                  const total = analytics?.totalQuotes || 1;
                  const percent = (count / total) * 100;

                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trend Chart */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Quotes Over Time</h2>
            {trendsLoading ? (
              <div className="flex h-48 items-end gap-1">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-full flex-1 animate-pulse rounded-t bg-gray-100" />
                ))}
              </div>
            ) : trends && trends.length > 0 ? (
              <div className="flex h-48 items-end gap-1">
                {trends.map((t: TrendData, i: number) => {
                  const height = (t.quotes / maxQuotes) * 100;
                  const acceptedHeight = (t.accepted / maxQuotes) * 100;

                  return (
                    <div key={i} className="group relative flex-1" title={`${t.period}: ${t.quotes} quotes`}>
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-gray-200 transition-all group-hover:bg-gray-300"
                        style={{ height: `${height}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-green-500 transition-all group-hover:bg-green-600"
                        style={{ height: `${acceptedHeight}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-gray-500">No data for selected period</div>
            )}
            {trends && trends.length > 0 && (
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{trends[0]?.period}</span>
                <span>{trends[trends.length - 1]?.period}</span>
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-gray-200" />
                <span className="text-gray-600">Total</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-gray-600">Accepted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rep Performance */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Sales Rep Performance</h2>
          {repsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : repPerformance && repPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 text-right font-medium">Quotes</th>
                    <th className="pb-3 text-right font-medium">Accepted</th>
                    <th className="pb-3 text-right font-medium">Conv. Rate</th>
                    <th className="pb-3 text-right font-medium">Total Value</th>
                    <th className="pb-3 text-right font-medium">Avg. Days</th>
                  </tr>
                </thead>
                <tbody>
                  {repPerformance.map((rep: RepPerformance) => (
                    <tr key={rep.userId} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{rep.userName}</td>
                      <td className="py-3 text-right text-gray-600">{rep.quotesCreated}</td>
                      <td className="py-3 text-right text-gray-600">{rep.quotesAccepted}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`font-medium ${
                            rep.conversionRate >= 0.5
                              ? 'text-green-600'
                              : rep.conversionRate >= 0.25
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {formatPercent(rep.conversionRate)}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(rep.totalValue)}</td>
                      <td className="py-3 text-right text-gray-600">{rep.avgDaysToClose || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">No data for selected period</p>
          )}
        </div>

        {/* Additional Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Average Quote Value</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(analytics?.averageValue || 0)}</p>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Accepted Value</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(analytics?.acceptedValue || 0)}</p>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">View-to-Accept Rate</p>
            {analyticsLoading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatPercent(analytics?.viewToAcceptRate || 0)}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
