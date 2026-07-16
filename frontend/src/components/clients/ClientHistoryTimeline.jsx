import { HISTORY_ACTION_LABELS } from '../../constants/clients';
import { formatDateTime } from '../../lib/dates';

export default function ClientHistoryTimeline({ items }) {
  if (!items?.length) {
    return (
      <div className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-text-muted">
        Todavía no hay actividad registrada.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="relative border-l-2 border-brand-200 pl-4">
          <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-brand-400" />
          <p className="text-sm font-medium text-text">
            {HISTORY_ACTION_LABELS[item.actionType] || item.actionType}
          </p>
          <p className="mt-1 text-sm text-text-muted">{item.description}</p>
          <p className="mt-2 text-xs text-text-muted">{formatDateTime(item.createdAt)}</p>
        </article>
      ))}
    </div>
  );
}
