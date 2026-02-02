import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Input, Select } from '../components/ui';

const countertopMaterials = [
  { value: 'granite', label: 'Granite' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'marble', label: 'Marble' },
  { value: 'laminate', label: 'Laminate' },
  { value: 'solid_surface', label: 'Solid Surface' },
  { value: 'butcher_block', label: 'Butcher Block' },
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'tile', label: 'Tile' },
  { value: 'other', label: 'Other' },
];

const mountingStyles = [
  { value: 'drop_in', label: 'Drop-in (Top Mount)' },
  { value: 'undermount', label: 'Undermount' },
  { value: 'farmhouse', label: 'Farmhouse (Apron Front)' },
  { value: 'flush_mount', label: 'Flush Mount' },
];

export function EditMeasurementPage() {
  const { id: measurementId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: measurement, isLoading: measurementLoading } = trpc.measurement.get.useQuery(
    { id: measurementId! },
    { enabled: !!measurementId }
  );

  const updateMeasurement = trpc.measurement.update.useMutation({
    onSuccess: async () => {
      if (measurement) {
        await utils.measurement.listByCustomer.invalidate({ customerId: measurement.customerId });
        await utils.measurement.get.invalidate({ id: measurementId! });
      }
      navigate(`/customers/${measurement?.customerId}`);
    },
  });

  const [formData, setFormData] = useState({
    location: '',
    cabinetWidthInches: '',
    cabinetDepthInches: '',
    cabinetHeightInches: '',
    countertopMaterial: '',
    countertopThicknessInches: '',
    countertopOverhangFrontInches: '',
    countertopOverhangSidesInches: '',
    mountingStyle: '',
    faucetHoleCount: '',
    faucetHoleSpacing: '',
    existingSinkWidthInches: '',
    existingSinkDepthInches: '',
    existingSinkBowlCount: '',
    backsplashHeightInches: '',
    windowClearanceInches: '',
    plumbingCenterlineFromLeft: '',
    garbageDisposal: false,
    dishwasherAirGap: false,
    notes: '',
  });
  const [error, setError] = useState('');

  // Populate form with existing measurement data
  useEffect(() => {
    if (measurement) {
      setFormData({
        location: measurement.location || '',
        cabinetWidthInches: measurement.cabinetWidthInches || '',
        cabinetDepthInches: measurement.cabinetDepthInches || '',
        cabinetHeightInches: measurement.cabinetHeightInches || '',
        countertopMaterial: measurement.countertopMaterial || '',
        countertopThicknessInches: measurement.countertopThicknessInches || '',
        countertopOverhangFrontInches: measurement.countertopOverhangFrontInches || '',
        countertopOverhangSidesInches: measurement.countertopOverhangSidesInches || '',
        mountingStyle: measurement.mountingStyle || '',
        faucetHoleCount: measurement.faucetHoleCount?.toString() || '',
        faucetHoleSpacing: measurement.faucetHoleSpacing || '',
        existingSinkWidthInches: measurement.existingSinkWidthInches || '',
        existingSinkDepthInches: measurement.existingSinkDepthInches || '',
        existingSinkBowlCount: measurement.existingSinkBowlCount?.toString() || '',
        backsplashHeightInches: measurement.backsplashHeightInches || '',
        windowClearanceInches: measurement.windowClearanceInches || '',
        plumbingCenterlineFromLeft: measurement.plumbingCenterlineFromLeft || '',
        garbageDisposal: measurement.garbageDisposal || false,
        dishwasherAirGap: measurement.dishwasherAirGap || false,
        notes: measurement.notes || '',
      });
    }
  }, [measurement]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await updateMeasurement.mutateAsync({
        id: measurementId!,
        location: formData.location || undefined,
        cabinetWidthInches: parseFloat(formData.cabinetWidthInches),
        cabinetDepthInches: parseFloat(formData.cabinetDepthInches),
        cabinetHeightInches: parseFloat(formData.cabinetHeightInches),
        countertopMaterial: formData.countertopMaterial || undefined,
        countertopThicknessInches: formData.countertopThicknessInches
          ? parseFloat(formData.countertopThicknessInches)
          : undefined,
        countertopOverhangFrontInches: formData.countertopOverhangFrontInches
          ? parseFloat(formData.countertopOverhangFrontInches)
          : undefined,
        countertopOverhangSidesInches: formData.countertopOverhangSidesInches
          ? parseFloat(formData.countertopOverhangSidesInches)
          : undefined,
        mountingStyle: formData.mountingStyle || undefined,
        faucetHoleCount: formData.faucetHoleCount
          ? parseInt(formData.faucetHoleCount, 10)
          : undefined,
        faucetHoleSpacing: formData.faucetHoleSpacing || undefined,
        existingSinkWidthInches: formData.existingSinkWidthInches
          ? parseFloat(formData.existingSinkWidthInches)
          : undefined,
        existingSinkDepthInches: formData.existingSinkDepthInches
          ? parseFloat(formData.existingSinkDepthInches)
          : undefined,
        existingSinkBowlCount: formData.existingSinkBowlCount
          ? parseInt(formData.existingSinkBowlCount, 10)
          : undefined,
        backsplashHeightInches: formData.backsplashHeightInches
          ? parseFloat(formData.backsplashHeightInches)
          : undefined,
        windowClearanceInches: formData.windowClearanceInches
          ? parseFloat(formData.windowClearanceInches)
          : undefined,
        plumbingCenterlineFromLeft: formData.plumbingCenterlineFromLeft
          ? parseFloat(formData.plumbingCenterlineFromLeft)
          : undefined,
        garbageDisposal: formData.garbageDisposal,
        dishwasherAirGap: formData.dishwasherAirGap,
        notes: formData.notes || undefined,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update measurement');
      }
    }
  };

  if (measurementLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-gray-500">Measurement not found</p>
        <Link to="/customers" className="mt-4">
          <Button>Back to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <Link to={`/customers/${measurement.customerId}`} className="text-gray-500 hover:text-gray-700">
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
            <h1 className="text-xl font-bold text-gray-900">Edit Measurement</h1>
            <p className="text-sm text-gray-500">
              {measurement.location || 'No location specified'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          {/* Location */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Location</h2>
            <Input
              label="Room/Area"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Kitchen, Master Bath, Utility Room"
            />
          </div>

          {/* Cabinet Dimensions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Cabinet Dimensions</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Width (inches)"
                type="number"
                step="0.125"
                value={formData.cabinetWidthInches}
                onChange={(e) => handleChange('cabinetWidthInches', e.target.value)}
                required
              />
              <Input
                label="Depth (inches)"
                type="number"
                step="0.125"
                value={formData.cabinetDepthInches}
                onChange={(e) => handleChange('cabinetDepthInches', e.target.value)}
                required
              />
              <Input
                label="Height (inches)"
                type="number"
                step="0.125"
                value={formData.cabinetHeightInches}
                onChange={(e) => handleChange('cabinetHeightInches', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Countertop Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Countertop Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Material"
                value={formData.countertopMaterial}
                onChange={(e) => handleChange('countertopMaterial', e.target.value)}
                options={[{ value: '', label: 'Select material...' }, ...countertopMaterials]}
              />
              <Input
                label="Thickness (inches)"
                type="number"
                step="0.125"
                value={formData.countertopThicknessInches}
                onChange={(e) => handleChange('countertopThicknessInches', e.target.value)}
                placeholder="e.g., 1.5"
              />
              <Input
                label="Front Overhang (inches)"
                type="number"
                step="0.125"
                value={formData.countertopOverhangFrontInches}
                onChange={(e) => handleChange('countertopOverhangFrontInches', e.target.value)}
              />
              <Input
                label="Side Overhang (inches)"
                type="number"
                step="0.125"
                value={formData.countertopOverhangSidesInches}
                onChange={(e) => handleChange('countertopOverhangSidesInches', e.target.value)}
              />
            </div>
          </div>

          {/* Mounting & Faucet */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Mounting & Faucet</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Mounting Style"
                value={formData.mountingStyle}
                onChange={(e) => handleChange('mountingStyle', e.target.value)}
                options={[{ value: '', label: 'Select style...' }, ...mountingStyles]}
              />
              <Input
                label="Faucet Holes"
                type="number"
                min="0"
                max="4"
                value={formData.faucetHoleCount}
                onChange={(e) => handleChange('faucetHoleCount', e.target.value)}
                placeholder="0-4"
              />
            </div>
            {formData.faucetHoleCount && parseInt(formData.faucetHoleCount, 10) > 1 && (
              <div className="mt-4">
                <Input
                  label="Faucet Hole Spacing"
                  value={formData.faucetHoleSpacing}
                  onChange={(e) => handleChange('faucetHoleSpacing', e.target.value)}
                  placeholder="e.g., 4 inch center, 8 inch spread"
                />
              </div>
            )}
          </div>

          {/* Existing Sink (for replacements) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Existing Sink (if replacing)</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Width (inches)"
                type="number"
                step="0.125"
                value={formData.existingSinkWidthInches}
                onChange={(e) => handleChange('existingSinkWidthInches', e.target.value)}
              />
              <Input
                label="Depth (inches)"
                type="number"
                step="0.125"
                value={formData.existingSinkDepthInches}
                onChange={(e) => handleChange('existingSinkDepthInches', e.target.value)}
              />
              <Input
                label="Bowl Count"
                type="number"
                min="1"
                max="3"
                value={formData.existingSinkBowlCount}
                onChange={(e) => handleChange('existingSinkBowlCount', e.target.value)}
              />
            </div>
          </div>

          {/* Clearances */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Clearances</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Backsplash Height (inches)"
                type="number"
                step="0.125"
                value={formData.backsplashHeightInches}
                onChange={(e) => handleChange('backsplashHeightInches', e.target.value)}
              />
              <Input
                label="Window Clearance (inches)"
                type="number"
                step="0.125"
                value={formData.windowClearanceInches}
                onChange={(e) => handleChange('windowClearanceInches', e.target.value)}
                placeholder="Distance to window sill"
              />
              <Input
                label="Plumbing Centerline (inches)"
                type="number"
                step="0.125"
                value={formData.plumbingCenterlineFromLeft}
                onChange={(e) => handleChange('plumbingCenterlineFromLeft', e.target.value)}
                placeholder="From left side"
              />
            </div>
          </div>

          {/* Accessories */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Accessories</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.garbageDisposal}
                  onChange={(e) => handleChange('garbageDisposal', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Garbage Disposal</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.dishwasherAirGap}
                  onChange={(e) => handleChange('dishwasherAirGap', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Dishwasher Air Gap</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Notes</h2>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={4}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this measurement..."
            />
          </div>

          <div className="flex gap-3">
            <Link to={`/customers/${measurement.customerId}`} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={updateMeasurement.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
