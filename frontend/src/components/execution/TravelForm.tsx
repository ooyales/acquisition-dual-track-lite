interface Props {
  form: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function TravelForm({ form, onChange }: Props) {
  const airfare = parseFloat(form.airfare_estimate || '0');
  const lodging = parseFloat(form.lodging_estimate || '0');
  const perDiem = parseFloat(form.per_diem_estimate || '0');
  const other = parseFloat(form.other_travel_costs || '0');
  const total = airfare + lodging + perDiem + other;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Travel Details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Traveler Name</label>
          <input className="input-field text-sm" value={form.traveler_name || ''}
            onChange={e => onChange('traveler_name', e.target.value)}
            placeholder="Full name" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Destination</label>
          <input className="input-field text-sm" value={form.destination || ''}
            onChange={e => onChange('destination', e.target.value)}
            placeholder="e.g., Washington, DC" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Departure Date</label>
          <input type="date" className="input-field text-sm" value={form.departure_date || ''}
            onChange={e => onChange('departure_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Return Date</label>
          <input type="date" className="input-field text-sm" value={form.return_date || ''}
            onChange={e => onChange('return_date', e.target.value)} />
        </div>
      </div>

      <h4 className="font-medium text-xs text-gray-600 pt-2">Cost Breakdown</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Airfare ($)</label>
          <input type="number" className="input-field text-sm" value={form.airfare_estimate || ''}
            onChange={e => onChange('airfare_estimate', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lodging ($)</label>
          <input type="number" className="input-field text-sm" value={form.lodging_estimate || ''}
            onChange={e => onChange('lodging_estimate', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Per Diem ($)</label>
          <input type="number" className="input-field text-sm" value={form.per_diem_estimate || ''}
            onChange={e => onChange('per_diem_estimate', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Other ($)</label>
          <input type="number" className="input-field text-sm" value={form.other_travel_costs || ''}
            onChange={e => onChange('other_travel_costs', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="bg-gray-50 rounded p-2 text-sm">
        <span className="text-gray-500">Estimated Total: </span>
        <span className="font-medium">${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
