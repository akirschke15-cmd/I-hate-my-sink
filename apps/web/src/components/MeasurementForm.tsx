import { useState } from 'react';
import { Button, Input, Select } from './ui';
import { measurementSchema, countertopMaterials } from '@ihms/shared/schemas';
import type { MeasurementInput } from '@ihms/shared/schemas';

interface MeasurementFormProps {
  customerId: string;
  onSubmit: (data: MeasurementInput) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<MeasurementInput>;
}

const countertopOptions = countertopMaterials.map((material) => ({
  value: material,
  label: material
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

const locationOptions = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
  { value: 'utility', label: 'Utility Room' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'outdoor', label: 'Outdoor Kitchen' },
  { value: 'other', label: 'Other' },
];

export function MeasurementForm({
  customerId,
  onSubmit,
  onCancel,
  initialData,
}: MeasurementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    cabinetWidthInches: initialData?.cabinetWidthInches?.toString() || '',
    cabinetDepthInches: initialData?.cabinetDepthInches?.toString() || '',
    cabinetHeightInches: initialData?.cabinetHeightInches?.toString() || '',
    countertopMaterial: initialData?.countertopMaterial || '',
    countertopThicknessInches: initialData?.countertopThicknessInches?.toString() || '',
    existingCutoutWidthInches: initialData?.existingCutoutWidthInches?.toString() || '',
    existingCutoutDepthInches: initialData?.existingCutoutDepthInches?.toString() || '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // Build the data object
      const data: MeasurementInput = {
        customerId,
        cabinetWidthInches: parseFloat(formData.cabinetWidthInches),
        cabinetDepthInches: parseFloat(formData.cabinetDepthInches),
        cabinetHeightInches: parseFloat(formData.cabinetHeightInches),
        countertopMaterial: formData.countertopMaterial
          ? (formData.countertopMaterial as (typeof countertopMaterials)[number])
          : undefined,
        countertopThicknessInches: formData.countertopThicknessInches
          ? parseFloat(formData.countertopThicknessInches)
          : undefined,
        existingCutoutWidthInches: formData.existingCutoutWidthInches
          ? parseFloat(formData.existingCutoutWidthInches)
          : undefined,
        existingCutoutDepthInches: formData.existingCutoutDepthInches
          ? parseFloat(formData.existingCutoutDepthInches)
          : undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };

      // Validate with Zod
      const result = measurementSchema.safeParse(data);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0]?.toString();
          if (field) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      await onSubmit(result.data);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ form: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{errors.form}</div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Cabinet Dimensions</h3>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Width (in)"
            type="number"
            step="0.25"
            min="0"
            max="120"
            value={formData.cabinetWidthInches}
            onChange={(e) => handleChange('cabinetWidthInches', e.target.value)}
            error={errors.cabinetWidthInches}
            placeholder="36"
            required
          />
          <Input
            label="Depth (in)"
            type="number"
            step="0.25"
            min="0"
            max="48"
            value={formData.cabinetDepthInches}
            onChange={(e) => handleChange('cabinetDepthInches', e.target.value)}
            error={errors.cabinetDepthInches}
            placeholder="24"
            required
          />
          <Input
            label="Height (in)"
            type="number"
            step="0.25"
            min="0"
            max="48"
            value={formData.cabinetHeightInches}
            onChange={(e) => handleChange('cabinetHeightInches', e.target.value)}
            error={errors.cabinetHeightInches}
            placeholder="36"
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Countertop Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Material"
            options={countertopOptions}
            placeholder="Select material..."
            value={formData.countertopMaterial}
            onChange={(e) => handleChange('countertopMaterial', e.target.value)}
            error={errors.countertopMaterial}
          />
          <Input
            label="Thickness (in)"
            type="number"
            step="0.125"
            min="0"
            max="4"
            value={formData.countertopThicknessInches}
            onChange={(e) => handleChange('countertopThicknessInches', e.target.value)}
            error={errors.countertopThicknessInches}
            placeholder="1.5"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Existing Cutout (if replacing)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cutout Width (in)"
            type="number"
            step="0.25"
            min="0"
            max="120"
            value={formData.existingCutoutWidthInches}
            onChange={(e) => handleChange('existingCutoutWidthInches', e.target.value)}
            error={errors.existingCutoutWidthInches}
            placeholder="33"
          />
          <Input
            label="Cutout Depth (in)"
            type="number"
            step="0.25"
            min="0"
            max="48"
            value={formData.existingCutoutDepthInches}
            onChange={(e) => handleChange('existingCutoutDepthInches', e.target.value)}
            error={errors.existingCutoutDepthInches}
            placeholder="22"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Additional Info</h3>
        <Select
          label="Location"
          options={locationOptions}
          placeholder="Select location..."
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          error={errors.location}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional details about the installation..."
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          Save Measurement
        </Button>
      </div>
    </form>
  );
}
