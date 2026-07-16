import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/reportsService';

const REPORTS_KEY = ['reports'];

export function useReportPreview(params, enabled = true) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'preview', params],
    queryFn: () => reportsApi.getPreview(params),
    enabled: enabled && Boolean(params?.type),
    placeholderData: (previousData) => previousData,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: reportsApi.exportReport,
  });
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: reportsApi.downloadReceipt,
  });
}

export function useReceiptWhatsApp() {
  return useMutation({
    mutationFn: reportsApi.getReceiptWhatsApp,
  });
}
