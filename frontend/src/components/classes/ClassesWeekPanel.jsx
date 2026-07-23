import { useEffect, useMemo, useState } from 'react';
import ClassDetailModal from './ClassDetailModal';
import ClassesDayDetail from './ClassesDayDetail';
import ClassesMonthCalendar from './ClassesMonthCalendar';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import NavIcon from '../ui/NavIcon';
import { useClassesCalendar, useGenerateClasses, useUpdateClass } from '../../hooks/useClasses';
import { getErrorMessage } from '../../lib/formErrors';
import {
  addMonthsToDate,
  formatMonthYear,
  getMonthCalendarDays,
  getMonthEndDate,
  getMonthStartDate,
  getNowPartsInArgentina,
  getTodayInArgentina,
  isClassPast,
  normalizeDateInput,
} from '../../lib/dates';

function buildGroupedByDate(data) {
  const grouped = {};
  const sourceClasses = Array.isArray(data?.classes)
    ? data.classes
    : Object.values(data?.grouped || {}).flat();

  for (const classItem of sourceClasses) {
    const dateKey = normalizeDateInput(classItem.classDate);

    if (!dateKey) {
      continue;
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push({
      ...classItem,
      classDate: dateKey,
    });
  }

  for (const dateKey of Object.keys(grouped)) {
    grouped[dateKey].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }

  return grouped;
}

/** Oculta días pasados y horarios de hoy que ya empezaron (hora Argentina). */
function filterUpcomingClasses(grouped, today, now) {
  const next = {};

  for (const [dateKey, classes] of Object.entries(grouped)) {
    if (dateKey < today) {
      continue;
    }

    if (dateKey === today) {
      const upcoming = classes.filter(
        (item) => !isClassPast(item.classDate, item.startTime, now)
      );
      if (upcoming.length > 0) {
        next[dateKey] = upcoming;
      }
      continue;
    }

    next[dateKey] = classes;
  }

  return next;
}

export default function ClassesWeekPanel() {
  const today = getTodayInArgentina();
  const [monthStart, setMonthStart] = useState(getMonthStartDate(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [now, setNow] = useState(() => getNowPartsInArgentina());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(getNowPartsInArgentina());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const calendarDays = useMemo(() => getMonthCalendarDays(monthStart), [monthStart]);
  const calendarFrom = calendarDays[0]?.date || monthStart;
  const calendarTo = calendarDays[calendarDays.length - 1]?.date || getMonthEndDate(monthStart);

  const { data, isLoading, isError, isFetching } = useClassesCalendar({
    from: calendarFrom,
    to: calendarTo,
  });
  const generateClasses = useGenerateClasses();
  const updateClass = useUpdateClass();

  const grouped = useMemo(() => buildGroupedByDate(data), [data]);
  const visibleGrouped = useMemo(
    () => filterUpcomingClasses(grouped, today, now),
    [grouped, today, now]
  );
  const selectedDayClasses = visibleGrouped[selectedDate] || [];
  const currentMonthStart = getMonthStartDate(today);
  const canGoPreviousMonth = monthStart > currentMonthStart;

  useEffect(() => {
    if (selectedDate < today) {
      setSelectedDate(today);
      setMonthStart(getMonthStartDate(today));
    }
  }, [selectedDate, today]);

  useEffect(() => {
    if (!selectedClass?.id) return;

    const sourceClasses = Array.isArray(data?.classes)
      ? data.classes
      : Object.values(data?.grouped || {}).flat();
    if (!sourceClasses.length) return;

    const fresh = sourceClasses.find((item) => Number(item.id) === Number(selectedClass.id));
    if (!fresh) return;

    setSelectedClass((current) => {
      if (!current || Number(current.id) !== Number(fresh.id)) return current;
      if (
        Number(current.bookedCount) === Number(fresh.bookedCount) &&
        Number(current.spotsAvailable) === Number(fresh.spotsAvailable) &&
        Boolean(current.isFull) === Boolean(fresh.isFull) &&
        current.status === fresh.status
      ) {
        return current;
      }
      return fresh;
    });
  }, [data, selectedClass?.id]);

  const monthStats = useMemo(() => {
    const allClasses = Object.values(visibleGrouped).flat();
    const scheduled = allClasses.filter((item) => item.status === 'scheduled');
    const booked = scheduled.reduce((sum, item) => sum + Number(item.bookedCount || 0), 0);
    const capacity = scheduled.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    const daysWithClasses = Object.keys(visibleGrouped).filter((date) => {
      const monthPrefix = monthStart.slice(0, 7);
      return date.startsWith(monthPrefix) && (visibleGrouped[date] || []).length > 0;
    }).length;

    return {
      scheduledCount: scheduled.length,
      booked,
      capacity,
      daysWithClasses,
      occupancyRate: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
    };
  }, [visibleGrouped, monthStart]);

  async function handleGenerate() {
    setFeedback(null);

    try {
      const result = await generateClasses.mutateAsync();
      setFeedback({
        type: 'success',
        message: `Generación completada: ${result.generation.created} clases nuevas.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo ejecutar la generación de clases.'),
      });
    }
  }

  async function handleCancelClass(classItem) {
    if (
      !window.confirm(`¿Cancelar la clase del ${classItem.classDate} a las ${classItem.startTime}?`)
    ) {
      return;
    }

    setFeedback(null);

    try {
      await updateClass.mutateAsync({
        id: classItem.id,
        payload: { status: 'cancelled' },
      });
      setSelectedClass(null);
      setFeedback({ type: 'success', message: 'Clase cancelada correctamente.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'No se pudo cancelar la clase.'),
      });
    }
  }

  function goToPreviousMonth() {
    setMonthStart((current) => {
      const previous = addMonthsToDate(current, -1);
      return previous < currentMonthStart ? currentMonthStart : previous;
    });
  }

  function goToNextMonth() {
    setMonthStart((current) => addMonthsToDate(current, 1));
  }

  function goToCurrentMonth() {
    setMonthStart(getMonthStartDate(today));
    setSelectedDate(today);
  }

  function handleSelectDate(date) {
    if (date < today) {
      return;
    }

    setSelectedDate(date);
    const nextMonthStart = getMonthStartDate(date);
    if (nextMonthStart !== monthStart) {
      setMonthStart(nextMonthStart);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <NavIcon name="classes" className="h-5 w-5 text-text" />
            </div>
            <div>
              <p className="text-base font-semibold capitalize text-text">
                {formatMonthYear(monthStart)}
              </p>
              <p className="text-sm text-text-muted">
                {isLoading
                  ? 'Cargando...'
                  : `${monthStats.daysWithClasses} días con agenda · ${monthStats.booked}/${monthStats.capacity || 0} cupos (${monthStats.occupancyRate}%)`}
                {isFetching && !isLoading ? ' · Actualizando' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              onClick={goToPreviousMonth}
              disabled={!canGoPreviousMonth}
              className="w-full sm:w-auto"
            >
              Anterior
            </Button>
            <Button variant="secondary" onClick={goToCurrentMonth} className="w-full sm:w-auto">
              Hoy
            </Button>
            <Button variant="secondary" onClick={goToNextMonth} className="w-full sm:w-auto">
              Siguiente
            </Button>
            <Button
              onClick={handleGenerate}
              isLoading={generateClasses.isPending}
              className="w-full sm:w-auto"
            >
              Generar clases
            </Button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4">
            <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
              {feedback.message}
            </Alert>
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <Alert variant="error">No se pudo cargar el calendario de clases.</Alert>
        </div>
      ) : isLoading && !data ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-text-muted shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
          Cargando clases...
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="min-w-0">
            <ClassesMonthCalendar
              monthStart={monthStart}
              grouped={visibleGrouped}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              isLoading={isFetching}
            />
          </div>
          <div className="min-w-0">
            <ClassesDayDetail
              selectedDate={selectedDate}
              classes={selectedDayClasses}
              onSelectClass={setSelectedClass}
              onCancelClass={handleCancelClass}
              isCancelling={updateClass.isPending}
            />
          </div>
        </div>
      )}

      <ClassDetailModal
        open={Boolean(selectedClass)}
        classItem={selectedClass}
        onClose={() => setSelectedClass(null)}
        onCancelClass={handleCancelClass}
        isCancelling={updateClass.isPending}
        onClassUpdated={(nextClass) => {
          if (!nextClass?.id) return;
          setSelectedClass((current) => {
            if (!current || Number(current.id) !== Number(nextClass.id)) return current;
            if (
              Number(current.bookedCount) === Number(nextClass.bookedCount) &&
              Number(current.spotsAvailable) === Number(nextClass.spotsAvailable) &&
              Boolean(current.isFull) === Boolean(nextClass.isFull) &&
              current.status === nextClass.status
            ) {
              return current;
            }
            return { ...current, ...nextClass };
          });
        }}
      />
    </div>
  );
}
