import { Link, useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: customer, isLoading: customerLoading } = trpc.customer.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const { data: measurements, isLoading: measurementsLoading } =
    trpc.measurement.listByCustomer.useQuery({ customerId: id! }, { enabled: !!id });

  const deleteCustomer = trpc.customer.delete.useMutation({
    onSuccess: () => {
      navigate('/customers');
    },
  });

  const deleteMeasurement = trpc.measurement.delete.useMutation({
    onSuccess: () => {
      utils.measurement.listByCustomer.invalidate({ customerId: id! });
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this customer? This cannot be undone.')) {
      deleteCustomer.mutate({ id: id! });
    }
  };

  const handleDeleteMeasurement = (measurementId: string) => {
    if (confirm('Delete this measurement?')) {
      deleteMeasurement.mutate({ id: measurementId });
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
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
            <h1 className="text-xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link to={`/customers/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleDelete}
              isLoading={deleteCustomer.isPending}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Info */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">Contact Information</h2>
              <dl className="space-y-3">
                {customer.email && (
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-gray-900">{customer.email}</dd>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <dt className="text-sm text-gray-500">Phone</dt>
                    <dd className="text-gray-900">{customer.phone}</dd>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <dt className="text-sm text-gray-500">Address</dt>
                    <dd className="text-gray-900">
                      {customer.address.street && <div>{customer.address.street}</div>}
                      {(customer.address.city || customer.address.state || customer.address.zip) && (
                        <div>
                          {customer.address.city}
                          {customer.address.city && customer.address.state && ', '}
                          {customer.address.state} {customer.address.zip}
                        </div>
                      )}
                    </dd>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <dt className="text-sm text-gray-500">Notes</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{customer.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Measurements */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Measurements</h2>
              <Link to={`/customers/${id}/measurements/new`}>
                <Button size="sm">New Measurement</Button>
              </Link>
            </div>

            {measurementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : measurements?.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
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
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No measurements yet</h3>
                <p className="mt-2 text-gray-500">
                  Capture cabinet and countertop dimensions for this customer.
                </p>
                <Link to={`/customers/${id}/measurements/new`} className="mt-4 inline-block">
                  <Button>Add Measurement</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {measurements?.map((measurement: { id: string; location?: string | null; createdAt: string | Date; cabinetWidthInches: string; cabinetDepthInches: string; cabinetHeightInches: string; countertopMaterial?: string | null; countertopThicknessInches?: string | null; notes?: string | null }) => (
                  <div key={measurement.id} className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {measurement.location || 'Measurement'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(measurement.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Cabinet: </span>
                            <span className="text-gray-900">
                              {measurement.cabinetWidthInches}" x {measurement.cabinetDepthInches}" x{' '}
                              {measurement.cabinetHeightInches}"
                            </span>
                          </div>
                          {measurement.countertopMaterial && (
                            <div>
                              <span className="text-gray-500">Countertop: </span>
                              <span className="text-gray-900 capitalize">
                                {measurement.countertopMaterial.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                          {measurement.countertopThicknessInches && (
                            <div>
                              <span className="text-gray-500">Thickness: </span>
                              <span className="text-gray-900">
                                {measurement.countertopThicknessInches}"
                              </span>
                            </div>
                          )}
                        </div>
                        {measurement.notes && (
                          <p className="mt-2 text-sm text-gray-500">{measurement.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/measurements/${measurement.id}/match`}>
                          <Button size="sm">Find Sinks</Button>
                        </Link>
                        <button
                          onClick={() => handleDeleteMeasurement(measurement.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
