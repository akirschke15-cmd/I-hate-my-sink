import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';
import { CustomerFormFields, emptyCustomerForm } from '../components/CustomerFormFields';
import type { CustomerFormData } from '../components/CustomerFormFields';

export function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: customer, isLoading: customerLoading } = trpc.customer.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const updateCustomer = trpc.customer.update.useMutation({
    onSuccess: () => {
      utils.customer.get.invalidate({ id: id! });
      navigate(`/customers/${id}`);
    },
  });

  const [formData, setFormData] = useState<CustomerFormData>(emptyCustomerForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || '',
        phone: customer.phone || '',
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        zip: customer.address?.zip || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await updateCustomer.mutateAsync({
        id: id!,
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update customer');
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
          <Link to={`/customers/${id}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Customer</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <CustomerFormFields formData={formData} onChange={handleChange} />

          <div className="flex gap-3">
            <Link to={`/customers/${id}`} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={updateCustomer.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
