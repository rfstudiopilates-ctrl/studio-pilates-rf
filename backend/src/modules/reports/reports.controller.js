import * as reportsService from './reports.service.js';

export async function getReportPreview(req, res, next) {
  try {
    const result = await reportsService.getReportPreview(req.validatedQuery);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function exportReport(req, res, next) {
  try {
    const result = await reportsService.exportReport(req.validatedQuery);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadReceiptPdf(req, res, next) {
  try {
    const result = await reportsService.generatePaymentReceiptPdf(
      req.params.movementId,
      req.auth.sub
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
}

export async function getReceiptWhatsApp(req, res, next) {
  try {
    const result = await reportsService.getPaymentReceiptWhatsApp(
      req.params.movementId,
      req.auth.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
