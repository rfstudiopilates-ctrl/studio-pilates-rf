import { api } from '../lib/api';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getFilenameFromDisposition(disposition, fallback) {
  const match = disposition?.match(/filename="(.+)"/);
  return match?.[1] || fallback;
}

export const reportsApi = {
  getPreview: async (params) => {
    const { data } = await api.get('/reports/preview', { params });
    return data.data;
  },

  exportReport: async (params) => {
    const response = await api.get('/reports/export', {
      params,
      responseType: 'blob',
    });

    const filename = getFilenameFromDisposition(
      response.headers['content-disposition'],
      `reporte.${params.format}`
    );

    downloadBlob(response.data, filename);
  },

  downloadReceipt: async (movementId) => {
    const response = await api.get(`/reports/receipts/${movementId}/pdf`, {
      responseType: 'blob',
    });

    const filename = getFilenameFromDisposition(
      response.headers['content-disposition'],
      `comprobante-${movementId}.pdf`
    );

    downloadBlob(response.data, filename);
  },

  getReceiptBlob: async (movementId) => {
    const response = await api.get(`/reports/receipts/${movementId}/pdf`, {
      responseType: 'blob',
    });

    return response.data;
  },

  getReceiptWhatsApp: async (movementId) => {
    const { data } = await api.get(`/reports/receipts/${movementId}/whatsapp`);
    return data.data;
  },
};
