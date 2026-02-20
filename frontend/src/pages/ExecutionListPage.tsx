import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus } from 'lucide-react';
import { executionApi } from '../api/execution';
import StatusBadge from '../components/common/StatusBadge';
import { EXECUTION_TYPE_LABELS } from '../types';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const isMobile = useIsMobile();

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-eaw-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CLIN Execution</h1>
            <p className="text-sm text-gray-500">{items.length} execution requests</p>
          </div>
        </div>
        <button onClick={() => navigate('/execution/new')} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus size={16} /> New Execution
        </button>
      </div>

      <div className="flex gap-2">
        <select className="select-field w-full sm:w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="odc">ODC</option>
          <option value="travel">Travel</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : isMobile ? (
        <div className="mobile-card-table">
          {items.map(item => (
            <div
              key={item.id}
              className="mobile-card-row clickable"
              onClick={() => navigate(`/execution/${item.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-sm">
                  #{item.id} {EXECUTION_TYPE_LABELS[item.execution_type] || item.execution_type}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{item.description}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{item.clin_number || `CLIN-${item.clin_id}`}</span>
                <span>${(item.requested_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
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
