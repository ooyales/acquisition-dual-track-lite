import { Check, Clock, X, AlertTriangle } from 'lucide-react';
import type { ApprovalStep } from '../../types';

interface Props {
  steps: ApprovalStep[];
}

export default function ApprovalPipeline({ steps }: Props) {
  if (!steps || steps.length === 0) {
    return <p className="text-sm text-gray-500">No approval steps assigned yet.</p>;
  }

  const sorted = [...steps].sort((a, b) => a.step_number - b.step_number);

  const icon = (status: string) => {
    if (status === 'approved') return <Check size={14} className="text-white" />;
    if (status === 'rejected') return <X size={14} className="text-white" />;
    if (status === 'active' || status === 'in_review') return <Clock size={14} className="text-white" />;
    if (status === 'pending') return <Clock size={14} className="text-white" />;
    return <AlertTriangle size={14} className="text-white" />;
  };

  const bgColor = (status: string) => {
    if (status === 'approved') return 'bg-green-500';
    if (status === 'rejected') return 'bg-red-500';
    if (status === 'active' || status === 'in_review') return 'bg-blue-500';
    if (status === 'pending') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Approval Pipeline</h3>
      <div className="relative">
        {sorted.map((step, i) => (
          <div key={step.id} className="flex items-start gap-3 mb-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bgColor(step.status)}`}>
                {icon(step.status)}
              </div>
              {i < sorted.length - 1 && <div className="w-px h-6 bg-gray-300 mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{step.gate_name || `Step ${step.step_number}`}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                  step.status === 'approved' ? 'bg-green-100 text-green-700' :
                  step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  step.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  step.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{step.status}</span>
              </div>
              <div className="text-xs text-gray-500">
                {step.approver_role && <span className="capitalize">{step.approver_role.replace(/_/g, ' ')}</span>}
                {step.decided_at && <span> · {new Date(step.decided_at).toLocaleDateString()}</span>}
                {step.is_overdue && <span className="text-red-600 font-medium"> · Overdue</span>}
              </div>
              {step.comments && <p className="text-xs text-gray-600 mt-1">{step.comments}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
