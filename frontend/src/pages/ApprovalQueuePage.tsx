import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { approvalsApi } from '../api/approvals';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/common/StatusBadge';

interface QueueItem {
  id: number;
  request_id: number;
  request_title: string;
  gate_name: string;
  step_number: number;
  approver_role: string;
  status: string;
  sla_days: number;
  assigned_at: string;
  is_overdue: boolean;
}

// Backend returns nested { step, request } items — flatten them
function flattenQueueItems(data: unknown): QueueItem[] {
  const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.queue || [];
  return (raw as Array<Record<string, unknown>>).map((item) => {
    const step = item.step as Record<string, unknown> | undefined;
    const req = item.request as Record<string, unknown> | undefined;
    if (step) {
      return {
        id: step.id as number,
        request_id: (step.request_id || req?.id) as number,
        request_title: (req?.title || `Request #${step.request_id}`) as string,
        gate_name: step.gate_name as string,
        step_number: step.step_number as number,
        approver_role: step.approver_role as string,
        status: step.status as string,
        sla_days: step.sla_days as number,
        assigned_at: step.assigned_at as string,
        is_overdue: step.is_overdue as boolean,
      };
    }
    // Already flat
    return item as unknown as QueueItem;
  });
}

export default function ApprovalQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const loadQueue = () => {
    approvalsApi.queue().then(data => {
      setQueue(flattenQueueItems(data));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleAction = async (stepId: number, action: 'approve' | 'reject') => {
    await approvalsApi.action(stepId, { action, role: user?.role || '', comments });
    setActionId(null);
    setComments('');
    loadQueue();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardCheck size={24} className="text-eaw-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-sm text-gray-500">{queue.length} items awaiting your review</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No pending approvals. You're all caught up!
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(item => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => navigate(`/requests/${item.request_id}`)}
                      className="font-medium text-eaw-primary hover:underline">
                      {item.request_title}
                    </button>
                    <StatusBadge status={item.status} />
                    {item.is_overdue && <span className="badge-red text-xs">Overdue</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    Gate: {item.gate_name} · Step {item.step_number} · SLA: {item.sla_days} days
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {actionId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input className="input-field text-sm w-48" placeholder="Comments..."
                        value={comments} onChange={e => setComments(e.target.value)} />
                      <button onClick={() => handleAction(item.id, 'approve')}
                        className="btn-success text-sm flex items-center gap-1">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => handleAction(item.id, 'reject')}
                        className="btn-danger text-sm flex items-center gap-1">
                        <X size={14} /> Reject
                      </button>
                      <button onClick={() => setActionId(null)} className="text-xs text-gray-500">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setActionId(item.id)} className="btn-primary text-sm">
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
