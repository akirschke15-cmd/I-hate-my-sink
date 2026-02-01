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

  const { data, isLoading, error } = trpc.sink.list.useQuery({
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Sink Catalog</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Filters */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Material"
              options={MATERIAL_OPTIONS}
              value={material}
              onChange={(e) => setMaterial(e.target.value as Material | '')}
            />
            <Select
              label="Mounting Style"
              options={MOUNTING_STYLE_OPTIONS}
              value={mountingStyle}
              onChange={(e) => setMountingStyle(e.target.value as MountingStyle | '')}
            />
            <Select
              label="Bowl Count"
              options={BOWL_COUNT_OPTIONS}
              value={bowlCount}
              onChange={(e) => setBowlCount(e.target.value)}
            />
            <Select
              label="Sort By"
              options={SORT_OPTIONS}
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
            />
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
          <p className="mb-4 text-sm text-gray-600">
            Showing {data.items.length} of {data.total} sinks
          </p>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">Failed to load sinks. Please try again.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : data?.items.length === 0 ? (
          /* Empty State */
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No sinks found</h3>
            <p className="mt-2 text-gray-500">
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
                className="overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Sink Image */}
                <div className="aspect-video bg-gray-100">
                  {sink.imageUrl ? (
                    <img
                      src={sink.imageUrl}
                      alt={sink.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg
                        className="h-16 w-16 text-gray-300"
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
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{sink.name}</h3>
                    <span className="text-lg font-bold text-primary-600">
                      {formatPrice(sink.basePrice)}
                    </span>
                  </div>

                  <p className="mb-3 text-sm text-gray-500">SKU: {sink.sku}</p>

                  {sink.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-600">{sink.description}</p>
                  )}

                  {/* Specs */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Material:</span>
                      <span className="text-gray-600">{formatMaterial(sink.material)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Style:</span>
                      <span className="text-gray-600">{formatMountingStyle(sink.mountingStyle)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Dimensions:</span>
                      <span className="text-gray-600">
                        {sink.widthInches}&quot;W x {sink.depthInches}&quot;D x {sink.heightInches}&quot;H
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Bowls:</span>
                      <span className="text-gray-600">
                        {sink.bowlCount === 1 ? 'Single' : sink.bowlCount === 2 ? 'Double' : 'Triple'}
                      </span>
                    </div>
                    {parseFloat(sink.laborCost) > 0 && (
                      <div className="flex items-center gap-2 text-sm">
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
