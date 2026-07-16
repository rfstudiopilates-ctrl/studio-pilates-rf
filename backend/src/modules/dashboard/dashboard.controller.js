import * as dashboardService from './dashboard.service.js';

export async function getOverview(req, res, next) {
  try {
    const overview = await dashboardService.getDashboardOverview(req.validatedQuery);
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
}

export async function getToday(req, res, next) {
  try {
    const today = await dashboardService.getTodayDashboard();
    res.json({ success: true, data: today });
  } catch (error) {
    next(error);
  }
}
