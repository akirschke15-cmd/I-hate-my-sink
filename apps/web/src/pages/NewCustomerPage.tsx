import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Input } from '../components/ui';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const createCustomer = trpc.customer.create.useMutation({
    onSuccess: () => {
      // Invalidate the customers list so it refetches
      utils.customer.list.invalidate();
    },
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const customer = await createCustomer.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        address:
          formData.street || formData.city || formData.state || formData.zip
            ? {
                street: formData.street || undefined,
                city: formData.city || undefined,
                state: formData.state || undefined,
                zip: formData.zip || undefined,
              }
            : null,
        notes: formData.notes || null,
      });

      navigate(`/customers/${customer.id}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create customer');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
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
          <h1 className="text-xl font-bold text-gray-900">New Customer</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Address</h2>
            <div className="space-y-4">
              <Input
                label="Street Address"
                value={formData.street}
                onChange={(e) => handleChange('street', e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
                <Input
                  label="ZIP Code"
                  value={formData.zip}
                  onChange={(e) => handleChange('zip', e.target.value)}
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
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this customer..."
            />
          </div>

          <div className="flex gap-3">
            <Link to="/customers" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={createCustomer.isPending}>
              Create Customer
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
