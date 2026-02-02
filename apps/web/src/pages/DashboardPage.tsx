import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, syncPending } = useOffline();

  // Fetch dashboard stats
  const { data: customers, isError: customersError, error: customersErrorMsg } = trpc.customer.list.useQuery({ limit: 5 });
  const { data: quotes, isError: quotesError, error: quotesErrorMsg } = trpc.quote.list.useQuery({ limit: 5 });
  const { data: sinks, isError: sinksError, error: sinksErrorMsg } = trpc.sink.list.useQuery({ limit: 1 });

  const customerCount = customers?.length || 0;
  const quoteCount = quotes?.length || 0;
  const sinkCount = sinks?.total || 0;

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
                <p className="text-xs text-gray-500">Field Sales Platform</p>
              </div>
            </div>

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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h2>
          <p className="mt-1 text-gray-600">
            Here's what's happening with your sales pipeline today.
          </p>
        </div>

        {/* Error States */}
        {(customersError || quotesError || sinksError) && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Failed to load some dashboard data</p>
            <p className="text-sm">
              {customersError && customersErrorMsg?.message}
              {quotesError && quotesErrorMsg?.message}
              {sinksError && sinksErrorMsg?.message}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customerCount.toString()}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            color="blue"
            link="/customers"
          />
          <StatCard
            title="Active Quotes"
            value={quoteCount.toString()}
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
            color="green"
            link="/quotes"
          />
          <StatCard
            title="Sink Catalog"
            value={sinkCount.toString()}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            color="purple"
            link="/sinks"
          />
          <StatCard
            title="Analytics"
            value="View"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            color="amber"
            link="/analytics"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500">Common tasks to get you started</p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <ActionCard
                  title="Add New Customer"
                  description="Create a new customer record"
                  to="/customers/new"
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                  }
                />
                <ActionCard
                  title="Browse Customers"
                  description="View and manage existing customers"
                  to="/customers"
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  }
                />
                <ActionCard
                  title="Browse Sink Catalog"
                  description="Explore available sink options"
                  to="/sinks"
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  }
                />
                <ActionCard
                  title="View All Quotes"
                  description="Manage quotes and proposals"
                  to="/quotes"
                  icon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>

          {/* Recent Customers Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Customers</h3>
                <p className="text-sm text-gray-500">Latest additions</p>
              </div>
              <div className="divide-y divide-gray-200">
                {customers && customers.length > 0 ? (
                  customers.slice(0, 5).map((customer: { id: string; firstName: string; lastName: string; email?: string | null }) => (
                    <Link
                      key={customer.id}
                      to={`/customers/${customer.id}`}
                      className="flex items-center gap-3 border-l-2 border-transparent px-6 py-3 hover:border-primary-300 hover:bg-gray-50"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                        {customer.firstName[0]}
                        {customer.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </p>
                        {customer.email && (
                          <p className="truncate text-xs text-gray-500">{customer.email}</p>
                        )}
                      </div>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">No customers yet</p>
                    <Link
                      to="/customers/new"
                      className="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      Add your first customer
                    </Link>
                  </div>
                )}
              </div>
              {customers && customers.length > 0 && (
                <div className="border-t border-gray-200 px-6 py-3">
                  <Link
                    to="/customers"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View all customers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-amber-900">You're currently offline</h4>
                <p className="mt-1 text-sm text-amber-700">
                  You can still capture measurements and create quotes. They'll sync automatically
                  when you're back online.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  link,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
  link: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <Link
      to={link}
      className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
        <svg
          className="h-5 w-5 text-gray-300 transition-colors group-hover:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </Link>
  );
}

function ActionCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-lg border border-gray-200 p-4 transition-all hover:border-primary-200 hover:bg-primary-50/50"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
