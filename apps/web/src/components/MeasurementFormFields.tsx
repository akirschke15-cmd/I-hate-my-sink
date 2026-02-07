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

export const existingSinkMaterials = [
  { value: 'cast_iron', label: 'Cast Iron' },
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'composite', label: 'Composite' },
  { value: 'unknown', label: 'Unknown' },
];

export const cabinetIntegrities = [
  { value: 'good', label: 'Good' },
  { value: 'questionable', label: 'Questionable' },
  { value: 'compromised', label: 'Compromised' },
];

export const supplyValvePositions = [
  { value: 'floor', label: 'Floor' },
  { value: 'low_back_wall', label: 'Low Back Wall' },
  { value: 'high_back_wall', label: 'High Back Wall' },
];

export interface MeasurementFormData {
  location: string;
  existingSinkMaterial: string;
  cabinetWidthInches: string;
  cabinetDepthInches: string;
  cabinetHeightInches: string;
  cabinetIntegrity: string;
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
  backsplashOverhangInches: string;
  windowClearanceInches: string;
  plumbingCenterlineFromLeft: string;
  supplyValvePosition: string;
  basinDepthClearanceInches: string;
  garbageDisposal: boolean;
  dishwasherAirGap: boolean;
  roSystemPresent: boolean;
  roTankClearanceInches: string;
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

      {/* Existing Sink Material */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Existing Sink Material</h2>
        <Select
          label="Material"
          value={formData.existingSinkMaterial}
          onChange={(e) => onChange('existingSinkMaterial', e.target.value)}
          options={[{ value: '', label: 'Select material...' }, ...existingSinkMaterials]}
        />
        {formData.existingSinkMaterial === 'cast_iron' && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">Cast iron removal requires additional labor and may limit sink options. Cabinet width must be 30&quot; or greater.</p>
            </div>
          </div>
        )}
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

      {/* Cabinet Integrity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Cabinet Integrity</h2>
        <Select
          label="Cabinet Condition"
          value={formData.cabinetIntegrity}
          onChange={(e) => onChange('cabinetIntegrity', e.target.value)}
          options={[{ value: '', label: 'Select condition...' }, ...cabinetIntegrities]}
        />
        {formData.cabinetIntegrity === 'compromised' && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">Compromised cabinet may require floor replacement before sink installation ($450-650).</p>
            </div>
          </div>
        )}
        {formData.cabinetIntegrity === 'questionable' && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-800">Cabinet may need reinforcement. Additional assessment recommended.</p>
            </div>
          </div>
        )}
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
            label="Backsplash Overhang (inches)"
            type="number"
            step="0.125"
            value={formData.backsplashOverhangInches}
            onChange={(e) => onChange('backsplashOverhangInches', e.target.value)}
            placeholder="Bar top overhang over sink area"
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
          <Select
            label="Supply Valve Position"
            value={formData.supplyValvePosition}
            onChange={(e) => onChange('supplyValvePosition', e.target.value)}
            options={[{ value: '', label: 'Select position...' }, ...supplyValvePositions]}
          />
          <Input
            label="Basin Depth Clearance (inches)"
            type="number"
            step="0.125"
            value={formData.basinDepthClearanceInches}
            onChange={(e) => onChange('basinDepthClearanceInches', e.target.value)}
            placeholder="Space below sink bottom"
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

      {/* RO System */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Reverse Osmosis System</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.roSystemPresent}
              onChange={(e) => onChange('roSystemPresent', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Reverse Osmosis System Present</span>
          </label>
          {formData.roSystemPresent && (
            <Input
              label="RO Tank Clearance (inches)"
              type="number"
              step="0.125"
              value={formData.roTankClearanceInches}
              onChange={(e) => onChange('roTankClearanceInches', e.target.value)}
              placeholder="Space available for RO tank"
            />
          )}
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
