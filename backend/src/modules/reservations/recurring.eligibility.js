/** Planes con más de 3 clases mensuales pueden tener horarios fijos. */
export const FIXED_SCHEDULE_MIN_MONTHLY_CLASSES = 3;

export function planAllowsFixedSchedules(plan) {
  if (!plan) {
    return false;
  }

  return Number(plan.monthlyClassesLimit ?? plan.monthlyClasses ?? 0) > FIXED_SCHEDULE_MIN_MONTHLY_CLASSES;
}

export function getFixedScheduleSlotLimit(plan) {
  if (!plan) {
    return 0;
  }

  return Number(plan.weeklyClassesLimit ?? plan.weeklyClasses ?? 0);
}
