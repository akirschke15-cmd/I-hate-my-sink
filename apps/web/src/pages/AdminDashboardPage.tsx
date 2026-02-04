import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, syncPending } = useOffline();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } =
    trpc.quote.analytics.getAnalytics.useQuery({});

  const { data: repPerformance, isLoading: repLoading, error: repError } =
    trpc.quote.analytics.getRepPerformance.useQuery({});

  // Don't render if not admin
  if (user?.role !== 'admin') {
    return null;
  }

  const isLoading = analyticsLoading || repLoading;
  const hasError = analyticsError || repError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">I Hate My Sink</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/dashboard"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Dashboard
              </Link>
              <Link
                to="/admin"
                className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md"
              >
                Admin
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Status indicators */}
              <div className="hidden items-center gap-3 sm:flex">
                {/* Online/Offline */}
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span className="text-xs font-medium text-gray-600">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Pending Sync */}
                {pendingSyncCount > 0 && (
                  <button
                    onClick={syncPending}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                    ) : (
                      <span>{pendingSyncCount}</span>
                    )}
                    <span>pending</span>
                  </button>
                )}
              </div>

              {/* User dropdown */}
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="mt-1 text-gray-600">
            Company-wide sales metrics and performance analytics
          </p>
        </div>

        {/* Error State */}
        {hasError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Failed to load analytics data</p>
            <p className="text-sm">
              {analyticsError?.message || repError?.message}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        )}

        {/* Content */}
        {!isLoading && analytics && (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Quotes"
                value={analytics.totalQuotes.toString()}
                subtitle="All statuses"
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
                color="blue"
              />
              <MetricCard
                title="Accepted Quotes"
                value={analytics.byStatus.accepted.toString()}
                subtitle={`${(analytics.conversionRate * 100).toFixed(1)}% conversion`}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                color="green"
              />
              <MetricCard
                title="Total Revenue"
                value={`$${analytics.acceptedValue.toLocaleString()}`}
                subtitle="Accepted value"
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                color="purple"
              />
              <MetricCard
                title="Avg Days to Close"
                value={analytics.avgDaysToClose.toString()}
                subtitle={`${analytics.byStatus.accepted} deals`}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                color="amber"
              />
            </div>

            {/* Quote Status Breakdown */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Quote Status Breakdown</h3>
                <p className="text-sm text-gray-500">Distribution across all statuses</p>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatusCard label="Draft" count={analytics.byStatus.draft} color="gray" />
                  <StatusCard label="Sent" count={analytics.byStatus.sent} color="blue" />
                  <StatusCard label="Viewed" count={analytics.byStatus.viewed} color="indigo" />
                  <StatusCard label="Accepted" count={analytics.byStatus.accepted} color="green" />
                  <StatusCard label="Rejected" count={analytics.byStatus.rejected} color="red" />
                  <StatusCard label="Expired" count={analytics.byStatus.expired} color="amber" />
                </div>
              </div>
            </div>

            {/* Sales Rep Performance */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Sales Rep Performance</h3>
                <p className="text-sm text-gray-500">Sorted by total value</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Rep Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quotes Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quotes Accepted
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Conversion Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Avg Days to Close
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {repPerformance && repPerformance.length > 0 ? (
                      repPerformance.map((rep: {
                        userId: string;
                        userName: string;
                        quotesCreated: number;
                        quotesAccepted: number;
                        conversionRate: number;
                        totalValue: number;
                        avgDaysToClose: number;
                      }) => (
                        <tr key={rep.userId} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                                {rep.userName
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{rep.userName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {rep.quotesCreated}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {rep.quotesAccepted}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                rep.conversionRate >= 0.5
                                  ? 'bg-green-100 text-green-800'
                                  : rep.conversionRate >= 0.3
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {(rep.conversionRate * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                            ${rep.totalValue.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {rep.avgDaysToClose > 0 ? `${rep.avgDaysToClose} days` : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                          No sales rep data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'gray' | 'blue' | 'indigo' | 'green' | 'red' | 'amber';
}) {
  const colorClasses = {
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold">{count}</p>
    </div>
  );
}
