interface Props {
  form: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function ODCForm({ form, onChange }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">ODC Details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Product/Service Name</label>
          <input className="input-field text-sm" value={form.product_name || ''}
            onChange={e => onChange('product_name', e.target.value)}
            placeholder="e.g., Dell Latitude 5540 Laptop" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Vendor</label>
          <input className="input-field text-sm" value={form.vendor || ''}
            onChange={e => onChange('vendor', e.target.value)}
            placeholder="e.g., Dell Technologies" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
          <input type="number" className="input-field text-sm" value={form.quantity || ''}
            onChange={e => onChange('quantity', e.target.value)} placeholder="1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Unit Price ($)</label>
          <input type="number" className="input-field text-sm" value={form.unit_price || ''}
            onChange={e => onChange('unit_price', e.target.value)} placeholder="0.00" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Quote Reference</label>
          <input className="input-field text-sm" value={form.quote_reference || ''}
            onChange={e => onChange('quote_reference', e.target.value)}
            placeholder="Vendor quote # or reference" />
        </div>
      </div>
    </div>
  );
}
