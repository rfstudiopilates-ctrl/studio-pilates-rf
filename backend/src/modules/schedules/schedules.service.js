import * as schedulesRepository from './schedules.repository.js';
import { generateClasses } from '../classes/classes.generation.js';
import { DAY_OF_WEEK_ORDER } from './schedules.constants.js';
import { createAppError } from '../../utils/AppError.js';
import { getSettings } from '../settings/settings.repository.js';
import { getRecurringOccupancyByTemplate } from '../reservations/reservations.repository.js';

function enrichSlotsWithFixedOccupancy(slots, settings, occupancy) {
  const defaultCapacity = Number(settings?.maxClassCapacity || 6);

  return slots.map((slot) => {
    const capacity = Number(slot.capacity || defaultCapacity);
    const occupiedInfo = occupancy[slot.id] || { occupied: 0, clients: [] };
    const fixedOccupied = Number(occupiedInfo.occupied || 0);
    const fixedRemaining = Math.max(0, capacity - fixedOccupied);

    return {
      ...slot,
      capacity,
      fixedOccupied,
      fixedRemaining,
      fixedClients: occupiedInfo.clients || [],
    };
  });
}

export async function getWeeklySchedule() {
  const [slots, settings, occupancy] = await Promise.all([
    schedulesRepository.listScheduleTemplates(),
    getSettings(),
    getRecurringOccupancyByTemplate(),
  ]);

  const enrichedSlots = enrichSlotsWithFixedOccupancy(slots, settings, occupancy);

  const grouped = DAY_OF_WEEK_ORDER.reduce((acc, day) => {
    acc[day] = enrichedSlots.filter((slot) => slot.dayOfWeek === day);
    return acc;
  }, {});

  return {
    slots: enrichedSlots,
    grouped,
    totalSlots: enrichedSlots.length,
  };
}

export async function replaceWeeklySchedule(slots) {
  const settings = await getSettings();
  const defaultCapacity = Number(settings?.maxClassCapacity || 6);
  const defaultDuration = Number(settings?.classDurationMinutes || 60);

  const normalizedSlots = [...slots]
    .map((slot) => ({
      ...slot,
      capacity: slot.capacity ?? defaultCapacity,
      durationMinutes: slot.durationMinutes ?? defaultDuration,
    }))
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });

  const uniqueKeys = new Set();
  for (const slot of normalizedSlots) {
    const key = `${slot.dayOfWeek}-${slot.startTime}`;
    if (uniqueKeys.has(key)) {
      throw createAppError('No podés repetir el mismo horario en un día', 400);
    }
    uniqueKeys.add(key);
  }

  const updatedSlots = await schedulesRepository.replaceScheduleTemplates(normalizedSlots);
  const generation = await generateClasses();
  const occupancy = await getRecurringOccupancyByTemplate();

  return {
    slots: enrichSlotsWithFixedOccupancy(updatedSlots, settings, occupancy),
    generation,
  };
}
