import { useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Select } from '../components/ui';

const MATERIAL_OPTIONS = [
  { value: '', label: 'All Materials' },
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'granite_composite', label: 'Granite Composite' },
  { value: 'cast_iron', label: 'Cast Iron' },
  { value: 'fireclay', label: 'Fireclay' },
  { value: 'copper', label: 'Copper' },
  { value: 'porcelain', label: 'Porcelain' },
];

const MOUNTING_STYLE_OPTIONS = [
  { value: '', label: 'All Styles' },
  { value: 'undermount', label: 'Undermount' },
  { value: 'drop_in', label: 'Drop-in' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'flush_mount', label: 'Flush Mount' },
];

const BOWL_COUNT_OPTIONS = [
  { value: '', label: 'Any Bowl Count' },
  { value: '1', label: 'Single Bowl' },
  { value: '2', label: 'Double Bowl' },
  { value: '3', label: 'Triple Bowl' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
  { value: 'width-asc', label: 'Width (Smallest)' },
  { value: 'width-desc', label: 'Width (Largest)' },
];

type Material = 'stainless_steel' | 'granite_composite' | 'cast_iron' | 'fireclay' | 'copper' | 'porcelain';
type MountingStyle = 'undermount' | 'drop_in' | 'farmhouse' | 'flush_mount';
type SortBy = 'name' | 'price' | 'width' | 'createdAt';
type SortOrder = 'asc' | 'desc';

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

export function SinksPage() {
  const [material, setMaterial] = useState<Material | ''>('');
  const [mountingStyle, setMountingStyle] = useState<MountingStyle | ''>('');
  const [bowlCount, setBowlCount] = useState<string>('');
  const [sortValue, setSortValue] = useState('name-asc');

  const [sortBy, sortOrder] = sortValue.split('-') as [SortBy, SortOrder];

  const { data, isLoading, isError, error } = trpc.sink.list.useQuery({
    material: material || undefined,
    mountingStyle: mountingStyle || undefined,
    bowlCount: bowlCount ? parseInt(bowlCount) : undefined,
    isActive: true,
    sortBy,
    sortOrder,
    limit: 50,
  });

  const formatMaterial = (mat: string) => {
    return mat
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatMountingStyle = (style: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-primary-100/50 bg-white/80 shadow-soft backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
            >
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
              <h1 className="text-2xl font-bold text-gray-900">Sink Catalog</h1>
              <p className="text-sm text-gray-600">Browse and filter our complete sink collection</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Filters */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-soft-lg">
          <div className="mb-4 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Filter Sinks</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="shadow-soft">
              <Select
                label="Material"
                options={MATERIAL_OPTIONS}
                value={material}
                onChange={(e) => setMaterial(e.target.value as Material | '')}
              />
            </div>
            <div className="shadow-soft">
              <Select
                label="Mounting Style"
                options={MOUNTING_STYLE_OPTIONS}
                value={mountingStyle}
                onChange={(e) => setMountingStyle(e.target.value as MountingStyle | '')}
              />
            </div>
            <div className="shadow-soft">
              <Select
                label="Bowl Count"
                options={BOWL_COUNT_OPTIONS}
                value={bowlCount}
                onChange={(e) => setBowlCount(e.target.value)}
              />
            </div>
            <div className="shadow-soft">
              <Select
                label="Sort By"
                options={SORT_OPTIONS}
                value={sortValue}
                onChange={(e) => setSortValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setMaterial('');
                  setMountingStyle('');
                  setBowlCount('');
                  setSortValue('name-asc');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {data && (
          <div className="mb-6 flex items-center gap-2">
            <span className="rounded-full bg-gradient-to-br from-primary-500 to-primary-600 px-3 py-1 text-sm font-semibold text-white shadow-brand">
              {data.items.length} of {data.total}
            </span>
            <span className="text-sm text-gray-600">sinks found</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Failed to load sinks</p>
            <p className="text-sm">{error?.message || 'Please try again later'}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : data?.items.length === 0 ? (
          /* Empty State */
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-primary-50/30 p-12 text-center shadow-soft-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-brand">
              <svg
                className="h-8 w-8 text-white"
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
            <h3 className="text-lg font-semibold text-gray-900">No sinks found</h3>
            <p className="mt-2 text-gray-600">
              {material || mountingStyle || bowlCount
                ? 'Try adjusting your filters to see more results.'
                : 'No sinks have been added to the catalog yet.'}
            </p>
            {(material || mountingStyle || bowlCount) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMaterial('');
                  setMountingStyle('');
                  setBowlCount('');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          /* Sink Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((sink: Sink) => (
              <div
                key={sink.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft transition-all hover:scale-[1.02] hover:border-gray-300 hover:shadow-brand"
              >
                {/* Sink Image */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100/50">
                  {sink.imageUrl ? (
                    <img
                      src={sink.imageUrl}
                      alt={sink.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg
                        className="h-16 w-16 text-primary-200"
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
                  <div className="absolute right-3 top-3 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-1.5 shadow-brand">
                    <span className="text-sm font-bold text-white">{formatPrice(sink.basePrice)}</span>
                  </div>
                </div>

                {/* Sink Details */}
                <div className="p-5">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">{sink.name}</h3>
                  <p className="mb-4 text-sm font-medium text-primary-600">SKU: {sink.sku}</p>

                  {sink.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600">{sink.description}</p>
                  )}

                  {/* Specs */}
                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gradient-to-br from-primary-50/50 to-transparent p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">Material:</span>
                      <span className="text-gray-600">{formatMaterial(sink.material)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">Style:</span>
                      <span className="text-gray-600">{formatMountingStyle(sink.mountingStyle)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">Size:</span>
                      <span className="text-gray-600">
                        {sink.widthInches}&quot;W x {sink.depthInches}&quot;D x {sink.heightInches}&quot;H
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-primary-600"
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
                      <span className="font-medium text-gray-700">Bowls:</span>
                      <span className="text-gray-600">
                        {sink.bowlCount === 1 ? 'Single' : sink.bowlCount === 2 ? 'Double' : 'Triple'}
                      </span>
                    </div>
                    {parseFloat(sink.laborCost) > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-4 w-4 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium text-gray-700">Labor:</span>
                        <span className="text-gray-600">{formatPrice(sink.laborCost)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {data?.hasMore && (
          <div className="mt-8 text-center">
            <Button variant="secondary">Load More</Button>
          </div>
        )}
      </main>
    </div>
  );
}
