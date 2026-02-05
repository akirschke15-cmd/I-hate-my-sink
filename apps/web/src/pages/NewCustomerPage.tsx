import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';
import { CustomerFormFields, emptyCustomerForm } from '../components/CustomerFormFields';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const createCustomer = trpc.customer.create.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
    },
  });

  const [formData, setFormData] = useState(emptyCustomerForm);
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

          <CustomerFormFields formData={formData} onChange={handleChange} />

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
