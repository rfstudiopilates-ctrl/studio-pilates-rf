import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from '../../constants/plans';

export default function PlanStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${PLAN_STATUS_STYLES[status] || 'bg-surface-muted text-text-muted border-border'}`}
    >
      {PLAN_STATUS_LABELS[status] || status}
    </span>
  );
}
