import { useMemo } from 'react';
import { Select } from '../ui';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Measurement {
  location: string | null;
  cabinetWidthInches: number;
  cabinetDepthInches: number;
}

interface CustomerSelectionProps {
  customerId: string;
  customers: Customer[] | undefined;
  measurement?: Measurement;
  error?: string;
  onChange: (customerId: string) => void;
  onClearError: () => void;
}

export function CustomerSelection({
  customerId,
  customers,
  measurement,
  error,
  onChange,
  onClearError,
}: CustomerSelectionProps) {
  const customerOptions = useMemo(() => {
    if (!customers) return [];
    return customers.map((c) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ''}`,
    }));
  }, [customers]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
    if (error) {
      onClearError();
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer</h2>
      <Select
        label="Select Customer"
        options={[{ value: '', label: 'Choose a customer...' }, ...customerOptions]}
        value={customerId}
        onChange={handleChange}
        error={error}
      />
      {measurement && (
        <p className="mt-2 text-sm text-gray-500">
          Linked to measurement: {measurement.location || 'Measurement'} (
          {measurement.cabinetWidthInches}&quot; x {measurement.cabinetDepthInches}&quot;)
        </p>
      )}
    </div>
  );
}
