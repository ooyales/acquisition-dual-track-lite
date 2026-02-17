import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus } from 'lucide-react';
import { executionApi } from '../api/execution';
import StatusBadge from '../components/common/StatusBadge';
import { EXECUTION_TYPE_LABELS } from '../types';

interface ExecItem {
  id: number;
  request_id: number;
  clin_id: number;
  execution_type: string;
  description: string;
  requested_amount: number;
  status: string;
  created_at: string;
  clin_number?: string;
  request_title?: string;
}

export default function ExecutionListPage() {
  const [items, setItems] = useState<ExecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (typeFilter) params.execution_type = typeFilter;
    executionApi.list(params).then(data => {
      setItems(Array.isArray(data) ? data : data.executions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-eaw-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CLIN Execution</h1>
            <p className="text-sm text-gray-500">{items.length} execution requests</p>
          </div>
        </div>
        <button onClick={() => navigate('/execution/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Execution
        </button>
      </div>

      <div className="flex gap-2">
        <select className="select-field w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="odc">ODC</option>
          <option value="travel">Travel</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="eaw-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Description</th>
                <th>CLIN</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/execution/${item.id}`)}>
                  <td className="text-gray-500">#{item.id}</td>
                  <td>{EXECUTION_TYPE_LABELS[item.execution_type] || item.execution_type}</td>
                  <td className="font-medium text-sm">{item.description}</td>
                  <td className="text-sm">{item.clin_number || `CLIN-${item.clin_id}`}</td>
                  <td className="text-sm">${(item.requested_amount || 0).toLocaleString()}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
