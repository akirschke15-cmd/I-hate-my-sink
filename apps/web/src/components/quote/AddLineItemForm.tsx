import { Input, Select, Button } from '../ui';
import { LineItemType } from '../../hooks/useLineItems';

const LINE_ITEM_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];

interface AddLineItemFormProps {
  formData: {
    type: LineItemType;
    name: string;
    description: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
  };
  errors: Record<string, string>;
  onFieldChange: <K extends keyof AddLineItemFormProps['formData']>(
    field: K,
    value: AddLineItemFormProps['formData'][K]
  ) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function AddLineItemForm({
  formData,
  errors,
  onFieldChange,
  onAdd,
  onCancel,
}: AddLineItemFormProps) {
  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4">
      <h3 className="mb-3 font-medium text-gray-900">Add Line Item</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          options={LINE_ITEM_TYPES}
          value={formData.type}
          onChange={(e) => onFieldChange('type', e.target.value as LineItemType)}
        />
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder="Item name"
          error={errors.name}
          required
        />
        <Input
          label="SKU (optional)"
          value={formData.sku}
          onChange={(e) => onFieldChange('sku', e.target.value)}
          placeholder="SKU"
        />
        <Input
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          placeholder="Description"
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          value={formData.quantity}
          onChange={(e) => onFieldChange('quantity', parseInt(e.target.value) || 1)}
          error={errors.quantity}
          required
        />
        <Input
          label="Unit Price"
          type="number"
          min={0}
          step={0.01}
          value={formData.unitPrice}
          onChange={(e) => onFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
          error={errors.unitPrice}
          required
        />
        <Input
          label="Discount %"
          type="number"
          min={0}
          max={100}
          value={formData.discountPercent}
          onChange={(e) => onFieldChange('discountPercent', parseFloat(e.target.value) || 0)}
          error={errors.discountPercent}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={onAdd} disabled={Object.keys(errors).length > 0}>
          Add
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
