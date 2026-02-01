import { Link, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';

interface Sink {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  material: string;
  mountingStyle: string;
  widthInches: string;
  depthInches: string;
  heightInches: string;
  bowlCount: number;
  basePrice: string;
  laborCost: string;
  imageUrl: string | null;
}

interface SinkMatch {
  sink: Sink;
  score: number;
  fitRating: 'excellent' | 'good' | 'marginal';
  reasons: string[];
}

const FIT_RATING_STYLES: Record<SinkMatch['fitRating'], { badge: string; icon: string; border: string }> = {
  excellent: {
    badge: 'bg-green-100 text-green-800',
    icon: 'text-green-500',
    border: 'border-green-200',
  },
  good: {
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500',
    border: 'border-blue-200',
  },
  marginal: {
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500',
    border: 'border-yellow-200',
  },
};

export function SinkMatchPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = trpc.sink.matchToMeasurement.useQuery(
    { measurementId: id! },
    { enabled: !!id }
  );

  const formatMaterial = (mat: string) => {
    return mat
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatMountingStyle = (style: string | null) => {
    if (!style) return 'Not specified';
    return style
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Invalid measurement ID</h2>
          <Link to="/customers" className="mt-4 inline-block text-primary-600 hover:underline">
            Go to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/customers" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Find Matching Sinks</h1>
          </div>
          <Link to="/sinks">
            <Button variant="secondary">Browse All Sinks</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">
              {error.message === 'Measurement not found'
                ? 'Measurement not found. It may have been deleted.'
                : 'Failed to load matching sinks. Please try again.'}
            </p>
            <Link to="/customers" className="mt-4 inline-block">
              <Button variant="secondary">Go to Customers</Button>
            </Link>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        )}

        {data && (
          <>
            {/* Measurement Summary */}
            <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Measurement Details</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500">Cabinet Width</p>
                  <p className="font-medium text-gray-900">{data.measurement.cabinetWidthInches}&quot;</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cabinet Depth</p>
                  <p className="font-medium text-gray-900">{data.measurement.cabinetDepthInches}&quot;</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cabinet Height</p>
                  <p className="font-medium text-gray-900">{data.measurement.cabinetHeightInches}&quot;</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preferred Style</p>
                  <p className="font-medium text-gray-900">
                    {formatMountingStyle(data.measurement.mountingStyle)}
                  </p>
                </div>
                {data.measurement.countertopMaterial && (
                  <div>
                    <p className="text-sm text-gray-500">Countertop</p>
                    <p className="font-medium text-gray-900">
                      {formatMaterial(data.measurement.countertopMaterial)}
                    </p>
                  </div>
                )}
                {data.measurement.location && (
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{data.measurement.location}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Results Summary */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found <span className="font-medium">{data.matches.length}</span> matching sinks out of{' '}
                <span className="font-medium">{data.totalCandidates}</span> candidates
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  Excellent
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  Good
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  Marginal
                </span>
              </div>
            </div>

            {/* No Matches */}
            {data.matches.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No matching sinks found</h3>
                <p className="mt-2 text-gray-500">
                  No sinks in the catalog fit the cabinet dimensions. Try adding more sinks or checking
                  the measurements.
                </p>
                <Link to="/sinks" className="mt-4 inline-block">
                  <Button variant="secondary">Browse All Sinks</Button>
                </Link>
              </div>
            ) : (
              /* Matching Sinks List */
              <div className="space-y-4">
                {data.matches.map((match: SinkMatch, index: number) => {
                  const styles = FIT_RATING_STYLES[match.fitRating];
                  return (
                    <div
                      key={match.sink.id}
                      className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm ${styles.border}`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Rank Badge */}
                        <div className="flex items-center justify-center bg-gray-50 px-4 py-4 sm:w-16">
                          <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        </div>

                        {/* Sink Image */}
                        <div className="aspect-video bg-gray-100 sm:aspect-square sm:w-32">
                          {match.sink.imageUrl ? (
                            <img
                              src={match.sink.imageUrl}
                              alt={match.sink.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <svg
                                className="h-10 w-10 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Sink Details */}
                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{match.sink.name}</h3>
                              <p className="text-sm text-gray-500">SKU: {match.sink.sku}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-primary-600">
                                {formatPrice(match.sink.basePrice)}
                              </span>
                              {parseFloat(match.sink.laborCost) > 0 && (
                                <p className="text-xs text-gray-500">
                                  + {formatPrice(match.sink.laborCost)} labor
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Specs Row */}
                          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <span>
                              {match.sink.widthInches}&quot;W x {match.sink.depthInches}&quot;D x{' '}
                              {match.sink.heightInches}&quot;H
                            </span>
                            <span>{formatMaterial(match.sink.material)}</span>
                            <span>{formatMountingStyle(match.sink.mountingStyle)}</span>
                            <span>
                              {match.sink.bowlCount === 1
                                ? 'Single Bowl'
                                : match.sink.bowlCount === 2
                                  ? 'Double Bowl'
                                  : 'Triple Bowl'}
                            </span>
                          </div>

                          {/* Fit Rating and Reasons */}
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${styles.badge}`}
                              >
                                {match.fitRating.charAt(0).toUpperCase() + match.fitRating.slice(1)} Fit
                              </span>
                              <span className="text-sm text-gray-500">Score: {match.score}</span>
                            </div>
                            <Link
                              to={`/quotes/new?measurementId=${id}&sinkId=${match.sink.id}`}
                            >
                              <Button size="sm">Create Quote</Button>
                            </Link>
                          </div>

                          {/* Match Reasons */}
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <p className="mb-1 text-xs font-medium text-gray-500">Match Details:</p>
                            <ul className="space-y-1">
                              {match.reasons.map((reason: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                  <span
                                    className={`mt-1 ${reason.startsWith('WARNING') ? 'text-red-500' : styles.icon}`}
                                  >
                                    {reason.startsWith('WARNING') ? (
                                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    ) : (
                                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
