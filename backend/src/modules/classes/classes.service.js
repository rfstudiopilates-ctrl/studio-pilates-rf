import { createAppError } from '../../utils/AppError.js';
import {
  addDaysToDate,
  getTodayInArgentina,
  getWeekStartDate,
} from '../../utils/dates.js';
import { generateClasses } from './classes.generation.js';
import * as classesRepository from './classes.repository.js';
import { CLASS_STATUSES } from './classes.constants.js';

export async function listClasses(query) {
  return classesRepository.listClasses(query);
}

export async function getClassCalendar(query) {
  const from = query.from || getWeekStartDate();
  const to = query.to || addDaysToDate(from, 6);
  const classes = await classesRepository.listClassesInRange({
    from,
    to,
    status: query.status,
  });

  const grouped = {};
  for (const classItem of classes) {
    if (!grouped[classItem.classDate]) {
      grouped[classItem.classDate] = [];
    }
    grouped[classItem.classDate].push(classItem);
  }

  return {
    from,
    to,
    classes,
    grouped,
    totalClasses: classes.length,
  };
}

export async function getAvailability(query) {
  const from = query.from || getTodayInArgentina();
  const to = query.to || addDaysToDate(from, 13);
  const classes = await classesRepository.listClassesInRange({
    from,
    to,
    status: 'scheduled',
  });

  return {
    from,
    to,
    items: classes.map((classItem) => ({
      id: classItem.id,
      classDate: classItem.classDate,
      startTime: classItem.startTime,
      endTime: classItem.endTime,
      capacity: classItem.capacity,
      bookedCount: classItem.bookedCount,
      spotsAvailable: classItem.spotsAvailable,
      isFull: classItem.isFull,
    })),
  };
}

export async function getClassById(id) {
  const classItem = await classesRepository.getClassById(id);
  if (!classItem) {
    throw createAppError('Clase no encontrada', 404);
  }
  return classItem;
}

export async function triggerClassGeneration() {
  return generateClasses();
}

export async function updateClass(id, payload) {
  const classItem = await getClassById(id);

  if (payload.capacity !== undefined && payload.capacity < classItem.bookedCount) {
    throw createAppError(
      `La capacidad no puede ser menor a las reservas actuales (${classItem.bookedCount})`,
      400
    );
  }

  if (payload.status && !CLASS_STATUSES.includes(payload.status)) {
    throw createAppError('Estado de clase inválido', 400);
  }

  if (payload.status === 'cancelled' && classItem.bookedCount > 0) {
    throw createAppError(
      'No podés cancelar una clase con reservas. Cancelá las reservas primero.',
      400
    );
  }

  return classesRepository.updateClass(id, payload);
}
