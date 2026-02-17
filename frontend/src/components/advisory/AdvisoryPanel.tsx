import { Shield, AlertTriangle, Check, Clock } from 'lucide-react';
import type { AdvisoryInput } from '../../types';
import { ADVISORY_LABELS } from '../../types';

interface Props {
  advisories: AdvisoryInput[];
}

const TEAM_COLORS: Record<string, string> = {
  scrm: 'border-purple-300 bg-purple-50',
  sbo: 'border-orange-300 bg-orange-50',
  cio: 'border-blue-300 bg-blue-50',
  section508: 'border-green-300 bg-green-50',
  fm: 'border-yellow-300 bg-yellow-50',
};

export default function AdvisoryPanel({ advisories }: Props) {
  if (!advisories || advisories.length === 0) {
    return <p className="text-sm text-gray-500">No advisory inputs required.</p>;
  }

  const statusIcon = (status: string) => {
    if (status === 'completed' || status === 'approved') return <Check size={14} className="text-green-600" />;
    if (status === 'flagged') return <AlertTriangle size={14} className="text-red-600" />;
    if (status === 'in_review' || status === 'pending') return <Clock size={14} className="text-yellow-600" />;
    return <Shield size={14} className="text-gray-400" />;
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield size={16} /> Advisory Inputs
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {advisories.map(adv => (
          <div key={adv.id} className={`rounded-lg border p-3 ${TEAM_COLORS[adv.team] || 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{ADVISORY_LABELS[adv.team] || adv.team}</span>
              <div className="flex items-center gap-1">
                {statusIcon(adv.status)}
                <span className="text-xs capitalize">{adv.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
            {adv.findings && (
              <p className="text-xs text-gray-600 line-clamp-2">{adv.findings}</p>
            )}
            {adv.impacts_strategy && (
              <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle size={10} /> Impacts strategy
              </div>
            )}
            {adv.blocks_gate && (
              <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle size={10} /> Blocks gate progression
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
