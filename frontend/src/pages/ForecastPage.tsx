import { useEffect, useState } from 'react';
import { TrendingUp, Plus, FileText } from 'lucide-react';
import { forecastsApi } from '../api/forecasts';
import StatusBadge from '../components/common/StatusBadge';

interface Forecast {
  id: number;
  title: string;
  source: string;
  estimated_value: number;
  need_by_date: string;
  suggested_loa_id: number | null;
  status: string;
  created_at: string;
  linked_request_id: number | null;
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', source: 'manual', estimated_value: '', need_by_date: '' });

  const loadForecasts = () => {
    forecastsApi.list().then(data => {
      setForecasts(Array.isArray(data) ? data : data.forecasts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadForecasts(); }, []);

  const handleCreate = async () => {
    await forecastsApi.create({
      ...form,
      estimated_value: parseFloat(form.estimated_value) || 0,
    });
    setShowForm(false);
    setForm({ title: '', source: 'manual', estimated_value: '', need_by_date: '' });
    loadForecasts();
  };

  const handleCreateRequest = async (id: number) => {
    await forecastsApi.createRequest(id);
    loadForecasts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-eaw-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demand Forecasting</h1>
            <p className="text-sm text-gray-500">{forecasts.length} forecast items</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Forecast
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="font-medium">New Demand Forecast</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input className="input-field text-sm" placeholder="Title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <select className="select-field text-sm" value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
              <option value="manual">Manual Entry</option>
              <option value="contract_expiry">Contract Expiry</option>
              <option value="option_year">Option Year</option>
            </select>
            <input type="number" className="input-field text-sm" placeholder="Estimated Value"
              value={form.estimated_value}
              onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
            <input type="date" className="input-field text-sm" value={form.need_by_date}
              onChange={e => setForm(f => ({ ...f, need_by_date: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary text-sm">Create Forecast</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="eaw-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Est. Value</th>
                <th>Need By</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map(f => (
                <tr key={f.id}>
                  <td className="font-medium">{f.title}</td>
                  <td className="text-sm capitalize">{f.source.replace(/_/g, ' ')}</td>
                  <td className="text-sm">${(f.estimated_value || 0).toLocaleString()}</td>
                  <td className="text-sm">{f.need_by_date || '—'}</td>
                  <td><StatusBadge status={f.status} /></td>
                  <td>
                    {f.status === 'identified' && !f.linked_request_id && (
                      <button onClick={() => handleCreateRequest(f.id)}
                        className="text-xs text-eaw-primary hover:underline flex items-center gap-1">
                        <FileText size={12} /> Create Request
                      </button>
                    )}
                    {f.linked_request_id && (
                      <span className="text-xs text-gray-500">Req #{f.linked_request_id}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
