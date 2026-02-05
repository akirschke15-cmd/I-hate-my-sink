import { Input, Select } from './ui';

export const countertopMaterials = [
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

export const mountingStyles = [
  { value: 'drop_in', label: 'Drop-in (Top Mount)' },
  { value: 'undermount', label: 'Undermount' },
  { value: 'farmhouse', label: 'Farmhouse (Apron Front)' },
  { value: 'flush_mount', label: 'Flush Mount' },
];

export interface MeasurementFormData {
  location: string;
  cabinetWidthInches: string;
  cabinetDepthInches: string;
  cabinetHeightInches: string;
  countertopMaterial: string;
  countertopThicknessInches: string;
  countertopOverhangFrontInches: string;
  countertopOverhangSidesInches: string;
  mountingStyle: string;
  faucetHoleCount: string;
  faucetHoleSpacing: string;
  existingSinkWidthInches: string;
  existingSinkDepthInches: string;
  existingSinkBowlCount: string;
  backsplashHeightInches: string;
  windowClearanceInches: string;
  plumbingCenterlineFromLeft: string;
  garbageDisposal: boolean;
  dishwasherAirGap: boolean;
  notes: string;
}

interface MeasurementFormFieldsProps {
  formData: MeasurementFormData;
  onChange: (field: string, value: string | boolean) => void;
}

export function MeasurementFormFields({ formData, onChange }: MeasurementFormFieldsProps) {
  return (
    <>
      {/* Location */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Location</h2>
        <Input
          label="Room/Area"
          value={formData.location}
          onChange={(e) => onChange('location', e.target.value)}
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
            onChange={(e) => onChange('cabinetWidthInches', e.target.value)}
            required
          />
          <Input
            label="Depth (inches)"
            type="number"
            step="0.125"
            value={formData.cabinetDepthInches}
            onChange={(e) => onChange('cabinetDepthInches', e.target.value)}
            required
          />
          <Input
            label="Height (inches)"
            type="number"
            step="0.125"
            value={formData.cabinetHeightInches}
            onChange={(e) => onChange('cabinetHeightInches', e.target.value)}
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
            onChange={(e) => onChange('countertopMaterial', e.target.value)}
            options={[{ value: '', label: 'Select material...' }, ...countertopMaterials]}
          />
          <Input
            label="Thickness (inches)"
            type="number"
            step="0.125"
            value={formData.countertopThicknessInches}
            onChange={(e) => onChange('countertopThicknessInches', e.target.value)}
            placeholder="e.g., 1.5"
          />
          <Input
            label="Front Overhang (inches)"
            type="number"
            step="0.125"
            value={formData.countertopOverhangFrontInches}
            onChange={(e) => onChange('countertopOverhangFrontInches', e.target.value)}
          />
          <Input
            label="Side Overhang (inches)"
            type="number"
            step="0.125"
            value={formData.countertopOverhangSidesInches}
            onChange={(e) => onChange('countertopOverhangSidesInches', e.target.value)}
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
            onChange={(e) => onChange('mountingStyle', e.target.value)}
            options={[{ value: '', label: 'Select style...' }, ...mountingStyles]}
          />
          <Input
            label="Faucet Holes"
            type="number"
            min="0"
            max="4"
            value={formData.faucetHoleCount}
            onChange={(e) => onChange('faucetHoleCount', e.target.value)}
            placeholder="0-4"
          />
        </div>
        {formData.faucetHoleCount && parseInt(formData.faucetHoleCount, 10) > 1 && (
          <div className="mt-4">
            <Input
              label="Faucet Hole Spacing"
              value={formData.faucetHoleSpacing}
              onChange={(e) => onChange('faucetHoleSpacing', e.target.value)}
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
            onChange={(e) => onChange('existingSinkWidthInches', e.target.value)}
          />
          <Input
            label="Depth (inches)"
            type="number"
            step="0.125"
            value={formData.existingSinkDepthInches}
            onChange={(e) => onChange('existingSinkDepthInches', e.target.value)}
          />
          <Input
            label="Bowl Count"
            type="number"
            min="1"
            max="3"
            value={formData.existingSinkBowlCount}
            onChange={(e) => onChange('existingSinkBowlCount', e.target.value)}
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
            onChange={(e) => onChange('backsplashHeightInches', e.target.value)}
          />
          <Input
            label="Window Clearance (inches)"
            type="number"
            step="0.125"
            value={formData.windowClearanceInches}
            onChange={(e) => onChange('windowClearanceInches', e.target.value)}
            placeholder="Distance to window sill"
          />
          <Input
            label="Plumbing Centerline (inches)"
            type="number"
            step="0.125"
            value={formData.plumbingCenterlineFromLeft}
            onChange={(e) => onChange('plumbingCenterlineFromLeft', e.target.value)}
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
              onChange={(e) => onChange('garbageDisposal', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Garbage Disposal</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.dishwasherAirGap}
              onChange={(e) => onChange('dishwasherAirGap', e.target.checked)}
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
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Additional notes about this measurement..."
        />
      </div>
    </>
  );
}
