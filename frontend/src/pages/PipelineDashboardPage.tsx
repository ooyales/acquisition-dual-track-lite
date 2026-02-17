import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import FundingBar from '../components/charts/FundingBar';
import PipelineFlow from '../components/charts/PipelineFlow';

interface CycleData {
  pipeline: string;
  avg_days: number;
  total_requests: number;
}

export default function PipelineDashboardPage() {
  const [pipeline, setPipeline] = useState<Array<{ stage: string; count: number }>>([]);
  const [cycleTime, setCycleTime] = useState<CycleData[]>([]);
  const [funding, setFunding] = useState<Array<{ name: string; projected: number; committed: number; obligated: number; available: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.pipeline().catch(() => ({})),
      dashboardApi.cycleTime().catch(() => ({})),
      dashboardApi.funding().catch(() => ({})),
    ]).then(([p, c, f]) => {
      // Backend returns { pipeline: [{ gate, label, count, ... }] }
      const pipelineData = (p?.pipeline || []).map((g: Record<string, unknown>) => ({
        stage: (g.label || g.gate) as string,
        count: g.count as number,
      }));
      setPipeline(pipelineData);
      setCycleTime(Array.isArray(c) ? c : c?.pipelines || []);
      // Backend returns { loas: [{ display_name, projected, committed, obligated, available }] }
      const fundingData = (f?.loas || []).map((l: Record<string, unknown>) => ({
        name: (l.display_name || l.fund_code || 'LOA') as string,
        projected: l.projected as number,
        committed: l.committed as number,
        obligated: l.obligated as number,
        available: l.available as number,
      }));
      setFunding(fundingData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-eaw-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Dashboard</h1>
          <p className="text-sm text-gray-500">Gate flow, cycle time, and funding analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline stages */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-3">Pipeline Stage Distribution</h2>
          <PipelineFlow data={pipeline} />
        </div>

        {/* Cycle time by pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-3">Average Cycle Time by Pipeline</h2>
          {cycleTime.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No cycle time data available.</p>
          ) : (
            <div className="space-y-3">
              {cycleTime.map(ct => (
                <div key={ct.pipeline} className="flex items-center gap-3">
                  <span className="text-sm w-28 capitalize">{ct.pipeline.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div className="bg-eaw-primary h-4 rounded-full flex items-center justify-end pr-2 text-white text-[10px]"
                      style={{ width: `${Math.min((ct.avg_days / 120) * 100, 100)}%`, minWidth: '3rem' }}>
                      {ct.avg_days}d
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-20">{ct.total_requests} requests</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Funding overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold mb-3">LOA Funding Overview</h2>
        <FundingBar data={funding} />
      </div>
    </div>
  );
}
