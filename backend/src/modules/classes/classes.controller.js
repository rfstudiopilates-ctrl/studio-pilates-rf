import * as classesService from './classes.service.js';
import { addDaysToDate, getTodayInArgentina } from '../../utils/dates.js';

export async function listClasses(req, res, next) {
  try {
    const query = { ...req.validatedQuery };
    if (!query.from) {
      query.from = getTodayInArgentina();
    }
    if (!query.to) {
      query.to = addDaysToDate(query.from, 30);
    }

    const result = await classesService.listClasses(query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getCalendar(req, res, next) {
  try {
    const calendar = await classesService.getClassCalendar(req.validatedQuery);
    res.json({ success: true, data: calendar });
  } catch (error) {
    next(error);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const availability = await classesService.getAvailability(req.validatedQuery);
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
}

export async function getClass(req, res, next) {
  try {
    const classItem = await classesService.getClassById(req.params.id);
    res.json({ success: true, data: { class: classItem } });
  } catch (error) {
    next(error);
  }
}

export async function generateClasses(req, res, next) {
  try {
    const generation = await classesService.triggerClassGeneration();
    res.json({ success: true, data: { generation } });
  } catch (error) {
    next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    const classItem = await classesService.updateClass(req.params.id, req.validatedBody);
    res.json({ success: true, data: { class: classItem } });
  } catch (error) {
    next(error);
  }
}

export async function listScheduleCleanupCandidates(req, res, next) {
  try {
    const data = await classesService.listScheduleCleanupCandidates();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function previewCancelFutureBySchedule(req, res, next) {
  try {
    const data = await classesService.previewCancelFutureBySchedule(req.validatedQuery);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function cancelFutureBySchedule(req, res, next) {
  try {
    const result = await classesService.cancelFutureClassesBySchedule({
      ...req.validatedBody,
      adminId: req.auth.sub,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
