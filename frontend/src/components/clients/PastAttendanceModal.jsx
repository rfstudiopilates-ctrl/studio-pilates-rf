import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { DAY_OF_WEEK_LABELS } from '../../constants/schedules';
import { formatDateDisplay } from '../../lib/dates';

export default function PastAttendanceModal({
  open,
  occurrences = [],
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    if (!open) {
      return;
    }

    const map = {};
    for (const item of occurrences) {
      map[item.date] = false;
    }
    setAttendance(map);
  }, [open, occurrences]);

  const attendedCount = Object.values(attendance).filter(Boolean).length;
  const missedCount = occurrences.length - attendedCount;

  function setAll(value) {
    const next = {};
    for (const item of occurrences) {
      next[item.date] = value;
    }
    setAttendance(next);
  }

  function handleConfirm() {
    onConfirm(
      occurrences.map((item) => ({
        date: item.date,
        attended: Boolean(attendance[item.date]),
      }))
    );
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Días anteriores del horario fijo"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          El plan empezó antes de hoy. Indicá si el cliente vino en cada fecha de este
          horario. Si vino, se descuenta del cupo; si no, queda como recuperación.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setAll(true)} disabled={isSubmitting}>
            Todos vinieron
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAll(false)} disabled={isSubmitting}>
            Ninguno vino
          </Button>
        </div>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {occurrences.map((item) => {
            const attended = Boolean(attendance[item.date]);
            return (
              <li
                key={item.date}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-text">
                    {DAY_OF_WEEK_LABELS[item.dayOfWeek] || ''} {formatDateDisplay(item.date)}
                  </p>
                  <p className="text-xs text-text-muted">{item.startTime}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setAttendance((prev) => ({ ...prev, [item.date]: true }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      attended
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-border bg-white text-text-muted hover:bg-surface-muted'
                    }`}
                  >
                    Vino
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setAttendance((prev) => ({ ...prev, [item.date]: false }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      !attended
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-border bg-white text-text-muted hover:bg-surface-muted'
                    }`}
                  >
                    No vino
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-text-muted">
          {attendedCount} asistencia{attendedCount === 1 ? '' : 's'} · {missedCount} como
          recuperación
        </p>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Confirmar y asignar fijo'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
