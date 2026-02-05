import { Input } from './ui';

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

export const emptyCustomerForm: CustomerFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
};

interface CustomerFormFieldsProps {
  formData: CustomerFormData;
  onChange: (field: string, value: string) => void;
}

export function CustomerFormFields({ formData, onChange }: CustomerFormFieldsProps) {
  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Contact Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Address</h2>
        <div className="space-y-4">
          <Input
            label="Street Address"
            value={formData.street}
            onChange={(e) => onChange('street', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => onChange('state', e.target.value)}
            />
            <Input
              label="ZIP Code"
              value={formData.zip}
              onChange={(e) => onChange('zip', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Notes</h2>
        <textarea
          className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={4}
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Additional notes about this customer..."
        />
      </div>
    </>
  );
}
