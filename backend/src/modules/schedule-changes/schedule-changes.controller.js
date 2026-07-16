import * as scheduleChangesService from './schedule-changes.service.js';

export async function listScheduleChanges(req, res, next) {
  try {
    const result = await scheduleChangesService.listScheduleChanges(req.validatedQuery);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPendingCount(req, res, next) {
  try {
    const count = await scheduleChangesService.getPendingScheduleChangesCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function getScheduleChange(req, res, next) {
  try {
    const request = await scheduleChangesService.getScheduleChangeById(req.params.id);
    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
}

export async function getMyScheduleChanges(req, res, next) {
  try {
    const result = await scheduleChangesService.getMyScheduleChanges(
      req.auth.sub,
      req.validatedQuery
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createMyScheduleChange(req, res, next) {
  try {
    const request = await scheduleChangesService.createScheduleChangeRequest({
      clientId: req.auth.sub,
      reservationId: req.validatedBody.reservationId,
      toGeneratedClassId: req.validatedBody.toGeneratedClassId,
      reason: req.validatedBody.reason,
    });
    res.status(201).json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyScheduleChange(req, res, next) {
  try {
    const request = await scheduleChangesService.cancelScheduleChangeRequest(
      req.params.id,
      req.auth.sub
    );
    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
}

export async function approveScheduleChange(req, res, next) {
  try {
    const result = await scheduleChangesService.approveScheduleChangeRequest(
      req.params.id,
      req.auth.sub,
      req.validatedBody
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function rejectScheduleChange(req, res, next) {
  try {
    const request = await scheduleChangesService.rejectScheduleChangeRequest(
      req.params.id,
      req.auth.sub,
      req.validatedBody?.adminNotes
    );
    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
}

export async function adminReassign(req, res, next) {
  try {
    const result = await scheduleChangesService.adminReassignReservation({
      reservationId: req.validatedBody.reservationId,
      toGeneratedClassId: req.validatedBody.toGeneratedClassId,
      adminNotes: req.validatedBody.adminNotes,
      adminId: req.auth.sub,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
