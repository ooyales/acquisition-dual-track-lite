const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-gray',
  submitted: 'badge-blue',
  in_review: 'badge-blue',
  intake_complete: 'badge-blue',
  advisory_review: 'badge-yellow',
  approval_pending: 'badge-yellow',
  pending: 'badge-yellow',
  approved: 'badge-green',
  awarded: 'badge-green',
  active: 'badge-green',
  completed: 'badge-green',
  healthy: 'badge-green',
  accepted: 'badge-green',
  validated: 'badge-green',
  watch: 'badge-yellow',
  critical: 'badge-red',
  rejected: 'badge-red',
  cancelled: 'badge-gray',
  exhausted: 'badge-red',
  closed: 'badge-gray',
  not_started: 'badge-gray',
  in_progress: 'badge-blue',
  invoiced: 'badge-blue',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status || ''] || 'badge-gray';
  const display = label || (status || 'unknown').replace(/_/g, ' ');

  return (
    <span className={`${colorClass} capitalize ${className}`}>
      {display}
    </span>
  );
}
