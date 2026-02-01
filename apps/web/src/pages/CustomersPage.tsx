import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Input } from '../components/ui';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: customers, isLoading } = trpc.customer.list.useQuery({
    search: debouncedSearch || undefined,
    limit: 50,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-primary-100/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="rounded-lg p-2 text-primary-600 hover:bg-primary-100/50 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">Customers</h1>
              <p className="text-sm text-primary-600">Manage your customer relationships</p>
            </div>
          </div>
          <Link to="/customers/new">
            <Button>Add Customer</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 relative max-w-md">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 shadow-soft border-primary-100/50 focus:border-primary-300 focus:ring-2 focus:ring-primary-200 rounded-xl w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : customers?.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-soft">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-md">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-medium text-gray-900">No customers yet</h3>
            <p className="mt-2 text-gray-500">Get started by adding your first customer.</p>
            <Link to="/customers/new" className="mt-6 inline-block">
              <Button>Add Customer</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customers?.map((customer: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null; address?: { city?: string; state?: string } | null }) => {
              const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();

              return (
                <Link
                  key={customer.id}
                  to={`/customers/${customer.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-primary-100/50 bg-white p-6 shadow-soft transition-all hover:shadow-brand hover:scale-[1.02]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-semibold text-white shadow-md">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      {customer.email && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <svg className="h-4 w-4 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <svg className="h-4 w-4 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="truncate">{customer.phone}</span>
                        </div>
                      )}
                    </div>
                    <svg
                      className="h-5 w-5 shrink-0 text-primary-400 transition-transform group-hover:translate-x-1"
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
                  {customer.address && (customer.address.city || customer.address.state) && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
                      <svg className="h-4 w-4 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">
                        {[customer.address.city, customer.address.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
