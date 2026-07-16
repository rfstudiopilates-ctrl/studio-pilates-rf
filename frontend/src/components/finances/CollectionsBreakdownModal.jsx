import { useMemo } from 'react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { PAYMENT_METHOD_LABELS } from '../../constants/finances';
import { formatCurrency } from '../../constants/plans';

export default function CollectionsBreakdownModal({
  open,
  onClose,
  byPaymentMethod = [],
  totalPayments = 0,
  totalGrossPayments = 0,
  totalRefunds = 0,
  isLoading = false,
  periodLabel = '',
  onFilterByMethod,
}) {
  const methods = useMemo(() => {
    const items = byPaymentMethod.map((item) => ({
      method: item.method,
      label: PAYMENT_METHOD_LABELS[item.method] || item.method,
      count: Number(item.count || 0),
      total: Number(item.total || 0),
    }));

    return items.sort((a, b) => b.total - a.total);
  }, [byPaymentMethod]);

  const methodsSum = useMemo(
    () => Number(methods.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
    [methods]
  );

  const totalPaymentsMovements = useMemo(
    () => methods.reduce((sum, item) => sum + item.count, 0),
    [methods]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Total cobrado"
      description={
        periodLabel
          ? `Desglose por método de pago · ${periodLabel}`
          : 'Desglose por método de pago del período seleccionado.'
      }
      size="3xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            {isLoading
              ? 'Cargando...'
              : `${methods.length} método${methods.length === 1 ? '' : 's'} · Total ${formatCurrency(totalPayments)}`}
          </p>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Total cobrado
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : formatCurrency(totalPayments)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Movimientos
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : totalPaymentsMovements}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Métodos usados
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : methods.length}
            </p>
          </div>
        </div>

        {Number(totalRefunds) > 0 ? (
          <div className="rounded-xl border border-border bg-surface-muted/30 px-4 py-3 text-sm text-text-muted">
            Bruto: {formatCurrency(totalGrossPayments)} · Devoluciones:{' '}
            {formatCurrency(totalRefunds)} · Neto: {formatCurrency(totalPayments)}
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-text-muted">Cargando desglose...</p>
        ) : methods.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            No hay cobros con método de pago registrado en este período.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="min-w-[560px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted/90">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Método
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Movimientos
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Monto
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    % del total
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {methods.map((item) => {
                  const share =
                    totalPayments > 0
                      ? Math.round((item.total / totalPayments) * 1000) / 10
                      : 0;

                  return (
                    <tr key={item.method} className="hover:bg-brand-50/30">
                      <td className="px-3 py-3 text-sm font-medium text-text">{item.label}</td>
                      <td className="px-3 py-3 text-right text-sm text-text-muted">{item.count}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-text-muted">
                        <div className="inline-flex min-w-18 flex-col items-end gap-1">
                          <span>{share}%</span>
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                            <span
                              className="block h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {typeof onFilterByMethod === 'function' ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onFilterByMethod(item.method);
                            }}
                            className="inline-flex rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface-muted"
                          >
                            Ver en historial
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-muted/60">
                  <td className="px-3 py-3 text-sm font-medium text-text">Total</td>
                  <td className="px-3 py-3 text-right text-sm font-medium text-text">
                    {totalPaymentsMovements}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                    {formatCurrency(methodsSum)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-text-muted">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
