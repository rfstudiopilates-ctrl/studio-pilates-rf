import * as reservationsService from './reservations.service.js';
import * as plansRepository from '../plans/plans.repository.js';

export async function listReservations(req, res, next) {
  try {
    const result = await reservationsService.listReservations(req.validatedQuery);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMyReservations(req, res, next) {
  try {
    const result = await reservationsService.getMyReservations(req.auth.sub, req.validatedQuery);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMyRecoveryCredits(req, res, next) {
  try {
    const credits = await reservationsService.getMyRecoveryCredits(req.auth.sub);
    res.json({ success: true, data: { credits } });
  } catch (error) {
    next(error);
  }
}

export async function getMyRecurring(req, res, next) {
  try {
    const recurring = await reservationsService.listMyRecurring(req.auth.sub);
    res.json({ success: true, data: { recurring } });
  } catch (error) {
    next(error);
  }
}

export async function createMyReservation(req, res, next) {
  try {
    const clientId = req.auth.sub;
    const { generatedClassId, recoveryCreditId, notes } = req.validatedBody;

    if (recoveryCreditId) {
      const reservation = await reservationsService.createReservation({
        clientId,
        generatedClassId,
        recoveryCreditId,
        status: 'confirmed',
        bookingType: 'recovery',
        notes,
      });
      res.status(201).json({ success: true, data: { reservation } });
      return;
    }

    await plansRepository.expireClientPlans();
    const activePlan = await plansRepository.findActiveClientPlan(clientId);

    if (activePlan) {
      const reservation = await reservationsService.createReservation({
        clientId,
        generatedClassId,
        status: 'confirmed',
        bookingType: 'standard',
        notes,
      });
      res.status(201).json({ success: true, data: { reservation } });
      return;
    }

    const reservation = await reservationsService.createReservation({
      clientId,
      generatedClassId,
      status: 'pending',
      bookingType: 'drop_in',
      skipPlanCheck: true,
      notes: notes || 'Solicitud de clase puntual sin plan',
    });

    res.status(201).json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyReservation(req, res, next) {
  try {
    const result = await reservationsService.cancelReservation({
      reservationId: req.params.id,
      cancelledBy: 'client',
      cancellationReason: req.validatedBody?.cancellationReason,
      clientId: req.auth.sub,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createReservationAdmin(req, res, next) {
  try {
    const reservation = await reservationsService.createReservation({
      clientId: req.validatedBody.clientId,
      generatedClassId: req.validatedBody.generatedClassId,
      recoveryCreditId: req.validatedBody.recoveryCreditId,
      status: req.validatedBody.status,
      notes: req.validatedBody.notes,
      createdByAdminId: req.auth.sub,
    });
    res.status(201).json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
}

export async function confirmReservation(req, res, next) {
  try {
    const result = await reservationsService.confirmReservation(
      req.params.id,
      req.auth.sub,
      req.validatedBody || {}
    );
    res.json({
      success: true,
      data: {
        reservation: result.reservation,
        clientPlan: result.clientPlan || null,
        debtMovement: result.debtMovement || null,
        depositMovement: result.depositMovement || null,
        balanceAfter: result.balanceAfter ?? null,
        planPrice: result.planPrice ?? null,
        depositAmount: result.depositAmount ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelReservationAdmin(req, res, next) {
  try {
    const result = await reservationsService.cancelReservation({
      reservationId: req.params.id,
      cancelledBy: 'admin',
      cancellationReason: req.validatedBody?.cancellationReason,
      adminId: req.auth.sub,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function clearCancelledReservation(req, res, next) {
  try {
    const reservation = await reservationsService.clearCancelledReservation(req.params.id);
    res.json({
      success: true,
      data: {
        reservation,
        message: 'Cancelación marcada como revisada',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getClassReservations(req, res, next) {
  try {
    const result = await reservationsService.getClassReservations(req.params.classId);
    res.json({
      success: true,
      data: {
        reservations: result.reservations,
        classItem: result.classItem,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientReservations(req, res, next) {
  try {
    const result = await reservationsService.getClientReservations(
      req.params.clientId,
      req.validatedQuery
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createRecurring(req, res, next) {
  try {
    const result = await reservationsService.createRecurringReservation(
      req.validatedBody,
      req.auth.sub
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listClientRecurring(req, res, next) {
  try {
    const recurring = await reservationsService.listClientRecurring(req.params.clientId);
    res.json({ success: true, data: { recurring } });
  } catch (error) {
    next(error);
  }
}

export async function listAllRecurring(req, res, next) {
  try {
    const recurring = await reservationsService.listAllRecurring(req.validatedQuery || {});
    res.json({ success: true, data: { recurring } });
  } catch (error) {
    next(error);
  }
}

export async function updateRecurring(req, res, next) {
  try {
    const result = await reservationsService.updateRecurringReservation(
      req.params.id,
      req.validatedBody,
      req.auth.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function processRecurring(req, res, next) {
  try {
    const processing = await reservationsService.processRecurringReservations();
    res.json({ success: true, data: { processing } });
  } catch (error) {
    next(error);
  }
}
