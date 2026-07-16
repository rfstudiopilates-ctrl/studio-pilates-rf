import { env } from '../../config/env.js';
import { getSettings } from '../settings/settings.repository.js';
import { listActiveScheduleTemplates } from '../schedules/schedules.repository.js';
import * as classesRepository from './classes.repository.js';
import {
  addDaysToDate,
  addMinutesToTime,
  getIsoDayOfWeek,
  getTodayInArgentina,
  normalizeTime,
} from '../../utils/dates.js';

export async function generateClasses(weeksAhead = env.classGenerationWeeksAhead) {
  const settings = await getSettings();
  const templates = await listActiveScheduleTemplates();

  if (templates.length === 0) {
    return {
      created: 0,
      skipped: 0,
      from: getTodayInArgentina(),
      to: getTodayInArgentina(),
      message: 'No hay horarios configurados',
    };
  }

  const today = getTodayInArgentina();
  const endDate = addDaysToDate(today, weeksAhead * 7);
  let created = 0;
  let skipped = 0;
  let currentDate = today;

  while (currentDate <= endDate) {
    const dayOfWeek = getIsoDayOfWeek(currentDate);
    const dayTemplates = templates.filter((template) => template.dayOfWeek === dayOfWeek);

    for (const template of dayTemplates) {
      const capacity = template.capacity ?? settings.maxClassCapacity;
      const duration = template.durationMinutes ?? settings.classDurationMinutes;
      const startTime = normalizeTime(template.startTime);
      const endTime = addMinutesToTime(startTime, duration);

      const inserted = await classesRepository.insertClassIfNotExists({
        scheduleTemplateId: template.id,
        classDate: currentDate,
        startTime,
        endTime,
        capacity,
      });

      if (inserted) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    currentDate = addDaysToDate(currentDate, 1);
  }

  return {
    created,
    skipped,
    from: today,
    to: endDate,
  };
}
