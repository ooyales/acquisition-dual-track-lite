import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Send } from 'lucide-react';
import { advisoryApi } from '../api/advisory';
import StatusBadge from '../components/common/StatusBadge';
import { ADVISORY_LABELS } from '../types';

interface AdvisoryData {
  id: number;
  request_id: number;
  team: string;
  status: string;
  assigned_at: string | null;
  findings: string | null;
  recommendation: string | null;
}

interface RequestData {
  id: number;
  request_number: string;
  title: string;
  estimated_value: number;
  derived_acquisition_type: string | null;
  derived_tier: string | null;
}

interface QueueItem {
  advisory: AdvisoryData;
  request: RequestData | null;
}

export default function AdvisoryQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('proceed');
  const [impactsStrategy, setImpactsStrategy] = useState(false);
  const [blocksGate, setBlocksGate] = useState(false);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const loadQueue = () => {
    setLoading(true);
    setError(null);
    advisoryApi.queue().then(data => {
      setQueue(Array.isArray(data) ? data : data.queue || []);
      setLoading(false);
    }).catch(err => {
      console.error('Advisory queue error:', err);
      setError(err.response?.status === 422 ? 'Session expired — please log out and log back in.' : `Failed to load queue: ${err.message}`);
      setLoading(false);
    });
  };

  useEffect(() => { loadQueue(); }, []);

  const handleSubmit = async (id: number) => {
    const status = recommendation === 'reject' || recommendation === 'hold'
      ? 'complete_issues_found'
      : 'complete_no_issues';
    await advisoryApi.submit(id, {
      findings,
      recommendation,
      impacts_strategy: impactsStrategy,
      status,
    });
    setActiveId(null);
    setFindings('');
    setRecommendation('proceed');
    setImpactsStrategy(false);
    setBlocksGate(false);
    loadQueue();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-eaw-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advisory Queue</h1>
          <p className="text-sm text-gray-500">{queue.length} items requiring advisory input</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No pending advisory reviews.
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => (
            <div key={item.advisory.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => navigate(`/requests/${item.advisory.request_id}`)}
                      className="font-medium text-eaw-primary hover:underline">
                      {item.request?.title || `Request #${item.advisory.request_id}`}
                    </button>
                    <StatusBadge status={item.advisory.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Team: {ADVISORY_LABELS[item.advisory.team] || item.advisory.team}
                    {item.request?.request_number && <span className="ml-2 text-gray-400">({item.request.request_number})</span>}
                  </p>
                </div>
                {activeId !== item.advisory.id && (
                  <button onClick={() => setActiveId(item.advisory.id)} className="btn-primary text-sm">
                    Provide Input
                  </button>
                )}
              </div>

              {activeId === item.advisory.id && (
                <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                    <textarea className="input-field" rows={3} value={findings}
                      onChange={e => setFindings(e.target.value)}
                      placeholder="Enter your findings and analysis..." />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                      <select className="select-field" value={recommendation}
                        onChange={e => setRecommendation(e.target.value)}>
                        <option value="proceed">Proceed</option>
                        <option value="proceed_with_conditions">Proceed with Conditions</option>
                        <option value="hold">Hold</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-6">
                      <input type="checkbox" checked={impactsStrategy}
                        onChange={e => setImpactsStrategy(e.target.checked)} />
                      Impacts acquisition strategy
                    </label>
                    <label className="flex items-center gap-2 text-sm pt-6">
                      <input type="checkbox" checked={blocksGate}
                        onChange={e => setBlocksGate(e.target.checked)} />
                      Blocks gate progression
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSubmit(item.advisory.id)} className="btn-primary text-sm flex items-center gap-1">
                      <Send size={14} /> Submit Findings
                    </button>
                    <button onClick={() => setActiveId(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
