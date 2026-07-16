import { Link } from 'react-router-dom';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_STYLES } from '../../constants/clients';
import { formatCurrency } from '../../constants/plans';

export default function ClientStatusBadge({ status, outstandingDebt = 0, clientId }) {
  const debtAmount = Number(outstandingDebt || 0);
  const hasDebt = debtAmount > 0;

  if (hasDebt) {
    const debtBadge = (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${CLIENT_STATUS_STYLES.debt}`}
      >
        {formatCurrency(debtAmount)}
      </span>
    );

    if (clientId == null) {
      return debtBadge;
    }

    return (
      <Link
        to={`/admin/clientes/${clientId}?tab=finances`}
        className="inline-flex transition hover:brightness-95 hover:underline"
        title="Ir a finanzas para registrar un pago"
        onClick={(event) => event.stopPropagation()}
      >
        {debtBadge}
      </Link>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${CLIENT_STATUS_STYLES[status] || 'bg-surface-muted text-text-muted border-border'}`}
    >
      {CLIENT_STATUS_LABELS[status] || status}
    </span>
  );
}
