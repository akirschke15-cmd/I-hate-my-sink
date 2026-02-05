import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';
import { MeasurementFormFields } from '../components/MeasurementFormFields';
import type { MeasurementFormData } from '../components/MeasurementFormFields';

export function NewMeasurementPage() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: customer, isLoading: customerLoading } = trpc.customer.get.useQuery(
    { id: customerId! },
    { enabled: !!customerId }
  );

  const createMeasurement = trpc.measurement.create.useMutation({
    onSuccess: async () => {
      await utils.measurement.listByCustomer.invalidate({ customerId: customerId! });
      navigate(`/customers/${customerId}`);
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

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createMeasurement.mutateAsync({
        customerId: customerId!,
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
        setError('Failed to save measurement');
      }
    }
  };

  if (customerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-gray-500">Customer not found</p>
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
          <Link to={`/customers/${customerId}`} className="text-gray-500 hover:text-gray-700">
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
            <h1 className="text-xl font-bold text-gray-900">New Measurement</h1>
            <p className="text-sm text-gray-500">
              {customer.firstName} {customer.lastName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <MeasurementFormFields formData={formData} onChange={handleChange} />

          <div className="flex gap-3">
            <Link to={`/customers/${customerId}`} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={createMeasurement.isPending}>
              Save Measurement
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
