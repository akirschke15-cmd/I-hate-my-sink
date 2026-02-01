import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { Button } from '../components/ui';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, syncPending } = useOffline();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="border-b border-primary-100/50 bg-white/80 backdrop-blur-sm shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Brand Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-brand">
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
            <h1 className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-xl font-bold text-transparent">
              I Hate My Sink
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Online/Offline Status */}
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-soft">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}
              />
              <span className="text-sm text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Pending Sync Badge */}
            {pendingSyncCount > 0 && (
              <button
                onClick={syncPending}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800 hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSyncing ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-800 border-t-transparent" />
                ) : (
                  <span className="font-medium">{pendingSyncCount}</span>
                )}
                <span>pending</span>
              </button>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-bold text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-8 shadow-soft-lg">
          {/* Decorative gradient blur */}
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 opacity-30 blur-3xl" />
          <div className="relative">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Welcome back, <span className="text-primary-600">{user?.firstName}</span>!
            </h2>
            <p className="text-gray-600">
              You're logged in as a <span className="font-medium">{user?.role}</span> at{' '}
              <span className="font-medium">{user?.companyName}</span>.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              title="New Measurement"
              description="Capture cabinet and countertop dimensions"
              to="/customers"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <ActionCard
              title="View Customers"
              description="Browse and manage your customer list"
              to="/customers"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            />
            <ActionCard
              title="Browse Sinks"
              description="Find the perfect sink match"
              to="/sinks"
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
            />
            <ActionCard
              title="Create Quote"
              description="Generate a new quote for a customer"
              to="/quotes/new"
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
            />
            <ActionCard
              title="View Analytics"
              description="Track quote conversion and performance"
              to="/analytics"
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
            />
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-soft">
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
      className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft transition-all hover:scale-[1.02] hover:shadow-brand"
    >
      <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white shadow-brand">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {/* Hover arrow indicator */}
      <div className="absolute bottom-4 right-4 translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
        <svg
          className="h-5 w-5 text-primary-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </div>
    </Link>
  );
}
