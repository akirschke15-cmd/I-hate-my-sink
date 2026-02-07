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
  series: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  installationType: string | null;
  bowlConfiguration: string | null;
  mfgMinCabinetWidthInches: string | null;
  isWorkstation: boolean;
  availableColors: { code: string; name: string; hex?: string }[] | null;
  accessoriesIncluded: string[] | null;
}

interface InstallMethodResult {
  method: string;
  feasible: boolean;
  reason: string;
}

interface SinkMatch {
  sink: Sink;
  score?: number;
  overallScore?: number;
  fitRating: 'excellent' | 'good' | 'marginal' | 'no_go';
  feasibleInstallMethods?: InstallMethodResult[];
  eliminatedInstallMethods?: InstallMethodResult[];
  hardGateFailures?: string[];
  warnings?: string[];
  addOnServices?: string[];
  dimensionalFit?: {
    widthClearance: number;
    depthClearance: number;
    heightClearance: number;
  };
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
  no_go: {
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500',
    border: 'border-red-200',
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

  const formatSeries = (seriesValue: string) => {
    return seriesValue
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatInstallMethod = (method: string) => {
    const map: Record<string, string> = {
      bowl_swap: 'Bowl Swap',
      cut_and_polish: 'Cut & Polish',
      top_mount: 'Top Mount',
      apron_front: 'Apron Front',
    };
    return map[method] || method;
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

        {data && (() => {
          const feasibleMatches = (data as any).feasibleMatches ?? (data as any).matches?.filter((m: SinkMatch) => m.fitRating !== 'no_go') ?? [];
          const noGoMatches = (data as any).noGoMatches ?? (data as any).matches?.filter((m: SinkMatch) => m.fitRating === 'no_go') ?? [];
          const totalCandidates = (data as any).totalCandidates ?? 0;

          return (
            <>
              {/* Measurement Summary */}
              <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Measurement Details</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-500">Cabinet Width</p>
                    <p className="font-medium text-gray-900">{(data as any).measurement.cabinetWidthInches}&quot;</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cabinet Depth</p>
                    <p className="font-medium text-gray-900">{(data as any).measurement.cabinetDepthInches}&quot;</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cabinet Height</p>
                    <p className="font-medium text-gray-900">{(data as any).measurement.cabinetHeightInches}&quot;</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Preferred Style</p>
                    <p className="font-medium text-gray-900">
                      {formatMountingStyle((data as any).measurement.mountingStyle)}
                    </p>
                  </div>
                  {(data as any).measurement.countertopMaterial && (
                    <div>
                      <p className="text-sm text-gray-500">Countertop</p>
                      <p className="font-medium text-gray-900">
                        {formatMaterial((data as any).measurement.countertopMaterial)}
                      </p>
                    </div>
                  )}
                  {(data as any).measurement.location && (
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{(data as any).measurement.location}</p>
                    </div>
                  )}
                  {(data as any).measurement.existingSinkMaterial && (
                    <div>
                      <p className="text-sm text-gray-500">Existing Sink Material</p>
                      <p className="font-medium text-gray-900">
                        {formatMaterial((data as any).measurement.existingSinkMaterial)}
                      </p>
                    </div>
                  )}
                  {(data as any).measurement.cabinetIntegrity && (
                    <div>
                      <p className="text-sm text-gray-500">Cabinet Integrity</p>
                      <p className="font-medium text-gray-900">
                        {formatMaterial((data as any).measurement.cabinetIntegrity)}
                      </p>
                    </div>
                  )}
                  {(data as any).measurement.roSystemPresent && (
                    <div>
                      <p className="text-sm text-gray-500">RO System</p>
                      <p className="font-medium text-gray-900">
                        {(data as any).measurement.roTankClearanceInches
                          ? `Yes (${(data as any).measurement.roTankClearanceInches}" clearance)`
                          : 'Yes'}
                      </p>
                    </div>
                  )}
                  {(data as any).measurement.backsplashOverhangInches && (
                    <div>
                      <p className="text-sm text-gray-500">Backsplash Overhang</p>
                      <p className="font-medium text-gray-900">{(data as any).measurement.backsplashOverhangInches}&quot;</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Summary */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found <span className="font-medium">{feasibleMatches.length}</span> compatible sinks
                  {noGoMatches.length > 0 && (
                    <span> and <span className="font-medium">{noGoMatches.length}</span> incompatible</span>
                  )}
                  {totalCandidates > 0 && (
                    <span> out of <span className="font-medium">{totalCandidates}</span> candidates</span>
                  )}
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
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    No-Go
                  </span>
                </div>
              </div>

              {/* No Matches */}
              {feasibleMatches.length === 0 && noGoMatches.length === 0 ? (
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
                <>
                  {/* Feasible Matches */}
                  {feasibleMatches.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Compatible Sinks</h3>
                      {feasibleMatches.map((match: SinkMatch, index: number) => {
                        const styles = FIT_RATING_STYLES[match.fitRating];
                        const score = match.overallScore ?? match.score ?? 0;
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
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold text-gray-900">{match.sink.name}</h3>
                                      {match.sink.series && (
                                        <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                                          {formatSeries(match.sink.series)}
                                        </span>
                                      )}
                                      {match.sink.isWorkstation && (
                                        <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                          Workstation
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500">SKU: {match.sink.sku}</p>
                                    {match.sink.modelNumber && (
                                      <p className="text-xs text-gray-400">Model: {match.sink.modelNumber}</p>
                                    )}
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

                                {/* Installation Methods */}
                                {match.feasibleInstallMethods && match.feasibleInstallMethods.length > 0 && (
                                  <div className="mb-2 flex flex-wrap gap-2">
                                    {match.feasibleInstallMethods.map((method) => (
                                      <span key={method.method} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {formatInstallMethod(method.method)}
                                      </span>
                                    ))}
                                    {match.eliminatedInstallMethods?.map((method) => (
                                      <span key={method.method} className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-400 line-through" title={method.reason}>
                                        {formatInstallMethod(method.method)}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Warnings */}
                                {match.warnings && match.warnings.length > 0 && (
                                  <div className="mb-2 space-y-1">
                                    {match.warnings.map((warning, i) => (
                                      <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                                        <svg className="h-3.5 w-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {warning}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add-on Services */}
                                {match.addOnServices && match.addOnServices.length > 0 && (
                                  <div className="mb-2 rounded-lg bg-blue-50 p-2">
                                    <p className="text-xs font-medium text-blue-800">Required Add-on Services:</p>
                                    <ul className="mt-1 space-y-0.5">
                                      {match.addOnServices.map((service, i) => (
                                        <li key={i} className="text-xs text-blue-700">{service}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Color Swatches */}
                                {match.sink.availableColors && match.sink.availableColors.length > 0 && (
                                  <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Colors:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {match.sink.availableColors.map((color) => (
                                        <div
                                          key={color.code}
                                          className="h-4 w-4 rounded-full border border-gray-300"
                                          style={{ backgroundColor: color.hex || '#ccc' }}
                                          title={color.name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Fit Rating and Reasons */}
                                <div className="mt-auto flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`rounded-full px-3 py-1 text-sm font-medium ${styles.badge}`}
                                    >
                                      {match.fitRating.charAt(0).toUpperCase() + match.fitRating.slice(1)} Fit
                                    </span>
                                    <span className="text-sm text-gray-500">Score: {score}</span>
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

                  {/* No-Go Section (collapsible) */}
                  {noGoMatches.length > 0 && (
                    <details className="mt-8">
                      <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                        {noGoMatches.length} incompatible sinks (click to expand)
                      </summary>
                      <div className="mt-4 space-y-3">
                        {noGoMatches.map((match: SinkMatch) => {
                          const styles = FIT_RATING_STYLES['no_go'];
                          return (
                            <div
                              key={match.sink.id}
                              className={`overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${styles.border}`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900">{match.sink.name}</h4>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                                      No-Go
                                    </span>
                                  </div>
                                  <p className="mb-2 text-sm text-gray-500">
                                    {match.sink.widthInches}&quot;W x {match.sink.depthInches}&quot;D
                                  </p>
                                  {match.hardGateFailures && match.hardGateFailures.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-red-700">Failure Reasons:</p>
                                      <ul className="space-y-0.5">
                                        {match.hardGateFailures.map((failure, i) => (
                                          <li key={i} className="text-xs text-red-600">{failure}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {match.reasons && match.reasons.length > 0 && !match.hardGateFailures && (
                                    <div className="space-y-1">
                                      <ul className="space-y-0.5">
                                        {match.reasons.map((reason, i) => (
                                          <li key={i} className="text-xs text-red-600">{reason}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}
