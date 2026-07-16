import * as schedulesService from './schedules.service.js';

export async function getWeeklySchedule(req, res, next) {
  try {
    const schedule = await schedulesService.getWeeklySchedule();
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}

export async function replaceWeeklySchedule(req, res, next) {
  try {
    const schedule = await schedulesService.replaceWeeklySchedule(req.validatedBody.slots);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}
