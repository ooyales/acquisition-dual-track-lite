import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardCheck, DollarSign, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { requestsApi } from '../api/requests';
import StatusBadge from '../components/common/StatusBadge';
import { ACQUISITION_TYPE_LABELS, TIER_LABELS, PIPELINE_LABELS } from '../types';
import type { AcquisitionRequest } from '../types';

interface Metrics {
  requests: { total: number; by_status: Record<string, number>; by_type: Record<string, number>; by_tier: Record<string, number>; total_value: number };
  approvals: { active: number; overdue: number };
  advisories: { pending: number };
  executions: { active: number };
  forecasts: { open: number };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<AcquisitionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      dashboardApi.metrics().catch(() => null),
      requestsApi.list({ per_page: '10' }).catch(() => ({ requests: [] })),
    ]).then(([m, reqData]) => {
      setMetrics(m);
      const reqs = Array.isArray(reqData) ? reqData : reqData.requests || [];
      setRecentRequests(reqs);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard...</div>;
  }

  const kpis = [
    { icon: FileText, label: 'Total Requests', value: metrics?.requests?.total ?? 0, color: 'text-eaw-primary' },
    { icon: ClipboardCheck, label: 'Pending Approvals', value: metrics?.approvals?.active ?? 0, color: 'text-yellow-600' },
    { icon: DollarSign, label: 'Total Value', value: `$${((metrics?.requests?.total_value ?? 0) / 1000000).toFixed(1)}M`, color: 'text-green-600' },
    { icon: TrendingUp, label: 'Active Executions', value: metrics?.executions?.active ?? 0, color: 'text-blue-600' },
    { icon: AlertTriangle, label: 'Overdue', value: metrics?.approvals?.overdue ?? 0, color: 'text-red-600' },
    { icon: Shield, label: 'Pending Advisory', value: metrics?.advisories?.pending ?? 0, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Acquisition pipeline overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className={kpi.color} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {metrics?.requests?.by_status && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-3">Status Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(metrics.requests.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-sm font-medium text-gray-700">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Requests</h2>
          <button onClick={() => navigate('/requests')} className="text-sm text-eaw-primary hover:underline">
            View all
          </button>
        </div>
        {recentRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="eaw-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Tier</th>
                  <th>Pipeline</th>
                  <th>Status</th>
                  <th>Requestor</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map(req => (
                  <tr
                    key={req.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/requests/${req.id}`)}
                  >
                    <td className="font-medium">{req.title}</td>
                    <td className="text-sm">{ACQUISITION_TYPE_LABELS[req.acquisition_type || ''] || req.acquisition_type}</td>
                    <td><StatusBadge status={req.tier || ''} label={TIER_LABELS[req.tier || '']} /></td>
                    <td className="text-sm">{PIPELINE_LABELS[req.pipeline || ''] || req.pipeline}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td className="text-sm">{req.requestor?.display_name || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
