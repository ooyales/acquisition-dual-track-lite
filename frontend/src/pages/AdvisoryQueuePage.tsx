import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Send, MessageSquare, Clock, Download } from 'lucide-react';
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
  info_request_message: string | null;
  info_response: string | null;
  info_response_filename: string | null;
}

interface RequestData {
  id: number;
  request_number: string;
  title: string;
  estimated_value: number;
  derived_acquisition_type: string | null;
  derived_tier: string | null;
}

interface SharedAttachment {
  advisory_id: number;
  team: string;
  filename: string;
}

interface QueueItem {
  advisory: AdvisoryData;
  request: RequestData | null;
  shared_attachments: SharedAttachment[];
}

export default function AdvisoryQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('proceed');
  const [impactsStrategy, setImpactsStrategy] = useState(false);
  const [blocksGate, setBlocksGate] = useState(false);
  const [infoRequestMessage, setInfoRequestMessage] = useState('');
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

  const resetForm = () => {
    setActiveId(null);
    setFindings('');
    setRecommendation('proceed');
    setImpactsStrategy(false);
    setBlocksGate(false);
    setInfoRequestMessage('');
  };

  const handleSubmit = async (id: number) => {
    if (recommendation === 'request_info') {
      await advisoryApi.submit(id, {
        findings,
        recommendation: 'request_info',
        info_request_message: infoRequestMessage,
        status: 'info_requested',
      });
    } else {
      const status = recommendation === 'reject' || recommendation === 'hold'
        ? 'complete_issues_found'
        : 'complete_no_issues';
      await advisoryApi.submit(id, {
        findings,
        recommendation,
        impacts_strategy: impactsStrategy,
        status,
      });
    }
    resetForm();
    loadQueue();
  };

  const openForm = (item: QueueItem) => {
    setActiveId(item.advisory.id);
    // If this advisory has a previous info response, pre-populate context
    if (item.advisory.info_response) {
      setFindings('');
      setRecommendation('proceed');
    }
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
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <button onClick={() => openForm(item)} className="btn-primary text-sm shrink-0">
                    Provide Input
                  </button>
                )}
              </div>

              {/* Shared attachments from other advisory teams */}
              {item.shared_attachments && item.shared_attachments.length > 0 && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Shared Attachments on This Request</p>
                  {item.shared_attachments.map(att => (
                    <button
                      key={att.advisory_id}
                      onClick={() => advisoryApi.downloadAttachment(att.advisory_id)}
                      className="flex items-center gap-2 text-sm text-eaw-primary hover:underline mb-1"
                    >
                      <Download size={14} />
                      <span>{att.filename}</span>
                      <span className="text-xs text-gray-400">(from {ADVISORY_LABELS[att.team] || att.team})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Show info request/response context */}
              {item.advisory.status === 'info_requested' && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                    <Clock size={14} /> Waiting for requestor to respond
                  </div>
                  <p className="text-sm text-amber-800">You asked: "{item.advisory.info_request_message}"</p>
                </div>
              )}

              {item.advisory.info_response && item.advisory.status !== 'info_requested' && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                    <MessageSquare size={14} /> Requestor responded
                  </div>
                  {item.advisory.info_request_message && (
                    <p className="text-xs text-blue-600 mb-1">You asked: "{item.advisory.info_request_message}"</p>
                  )}
                  <p className="text-sm text-blue-800">{item.advisory.info_response}</p>
                  {item.advisory.info_response_filename && (
                    <button
                      onClick={() => advisoryApi.downloadAttachment(item.advisory.id)}
                      className="mt-2 text-sm text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Download size={14} /> {item.advisory.info_response_filename}
                    </button>
                  )}
                </div>
              )}

              {activeId === item.advisory.id && (
                <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                    <textarea className="input-field" rows={3} value={findings}
                      onChange={e => setFindings(e.target.value)}
                      placeholder="Enter your findings and analysis..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                      <select className="select-field" value={recommendation}
                        onChange={e => setRecommendation(e.target.value)}>
                        <option value="proceed">Proceed</option>
                        <option value="proceed_with_conditions">Proceed with Conditions</option>
                        <option value="request_info">Request Information</option>
                        <option value="hold">Hold</option>
                        <option value="reject">Reject</option>
                      </select>
                    </div>
                    {recommendation !== 'request_info' && (
                      <>
                        <label className="flex items-center gap-2 text-sm sm:pt-6">
                          <input type="checkbox" checked={impactsStrategy}
                            onChange={e => setImpactsStrategy(e.target.checked)} />
                          Impacts acquisition strategy
                        </label>
                        <label className="flex items-center gap-2 text-sm sm:pt-6">
                          <input type="checkbox" checked={blocksGate}
                            onChange={e => setBlocksGate(e.target.checked)} />
                          Blocks gate progression
                        </label>
                      </>
                    )}
                  </div>

                  {recommendation === 'request_info' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What information do you need from the requestor?
                      </label>
                      <textarea className="input-field" rows={2} value={infoRequestMessage}
                        onChange={e => setInfoRequestMessage(e.target.value)}
                        placeholder="e.g., Please provide the vendor quote or Bill of Materials..." />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSubmit(item.advisory.id)}
                      disabled={recommendation === 'request_info' && !infoRequestMessage.trim()}
                      className={`text-sm flex items-center gap-1 ${
                        recommendation === 'request_info' ? 'btn-secondary border-amber-400 text-amber-700 hover:bg-amber-50' : 'btn-primary'
                      }`}
                      style={recommendation === 'request_info' && !infoRequestMessage.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {recommendation === 'request_info' ? (
                        <><MessageSquare size={14} /> Send Information Request</>
                      ) : (
                        <><Send size={14} /> Submit Findings</>
                      )}
                    </button>
                    <button onClick={resetForm} className="btn-secondary text-sm">Cancel</button>
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
