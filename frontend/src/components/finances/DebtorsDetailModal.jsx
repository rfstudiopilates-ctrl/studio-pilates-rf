import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../constants/plans';

export default function DebtorsDetailModal({
  open,
  onClose,
  debtors = [],
  outstandingTotal = 0,
  isLoading = false,
  onViewDebtHistory,
}) {
  const [search, setSearch] = useState('');

  const debtorsSum = useMemo(
    () =>
      Number(
        debtors.reduce((sum, item) => sum + Number(item.outstandingDebt || 0), 0).toFixed(2)
      ),
    [debtors]
  );

  const filteredDebtors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return debtors;

    return debtors.filter((debtor) => {
      const haystack = [
        debtor.clientName,
        debtor.clientUsername,
        debtor.clientPhone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [debtors, search]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Deuda pendiente"
      description="Composición del total actual. Solo clientes con saldo negativo."
      size="3xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            {isLoading
              ? 'Cargando...'
              : `${debtors.length} cliente${debtors.length === 1 ? '' : 's'} · Total ${formatCurrency(outstandingTotal)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {debtors.length > 0 && typeof onViewDebtHistory === 'function' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  handleClose();
                  onViewDebtHistory();
                }}
              >
                Ver cargos históricos
              </Button>
            ) : null}
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 sm:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Total pendiente
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : formatCurrency(outstandingTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Clientes
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : debtors.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Suma de la lista
            </p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {isLoading ? '...' : formatCurrency(debtorsSum)}
            </p>
          </div>
        </div>

        {!isLoading && debtors.length > 0 ? (
          <Input
            label="Buscar deudor"
            placeholder="Nombre, usuario o teléfono..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        ) : null}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-text-muted">Cargando deudores...</p>
        ) : debtors.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            No hay clientes con deuda pendiente.
          </p>
        ) : filteredDebtors.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            Ningún deudor coincide con “{search.trim()}”.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="min-w-[680px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted/90">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Cliente
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Teléfono
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Saldo
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Debe
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredDebtors.map((debtor) => (
                  <tr key={debtor.clientId} className="hover:bg-brand-50/30">
                    <td className="px-3 py-3 text-sm">
                      <p className="font-medium text-text">{debtor.clientName}</p>
                      <p className="text-xs text-text-muted">@{debtor.clientUsername}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-text-muted">
                      {debtor.clientPhone || '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-danger">
                      {formatCurrency(debtor.balance)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatCurrency(debtor.outstandingDebt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/admin/clientes/${debtor.clientId}?tab=finances`}
                        onClick={handleClose}
                        className="inline-flex rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface-muted"
                      >
                        Ver cuenta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!search.trim() ? (
                <tfoot>
                  <tr className="border-t border-border bg-surface-muted/60">
                    <td colSpan={3} className="px-3 py-3 text-sm font-medium text-text">
                      Total ({debtors.length} cliente{debtors.length === 1 ? '' : 's'})
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatCurrency(debtorsSum)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
