import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';
import { MeasurementFormFields } from '../components/MeasurementFormFields';
import type { MeasurementFormData } from '../components/MeasurementFormFields';

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

  const [formData, setFormData] = useState<MeasurementFormData>({
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

          <MeasurementFormFields formData={formData} onChange={handleChange} />

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
