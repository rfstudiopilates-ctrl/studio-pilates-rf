import { useState } from 'react';
import { openWhatsApp } from '../../lib/whatsapp';
import { getErrorMessage } from '../../lib/formErrors';
import { reportsApi } from '../../services/reportsService';
import { useDownloadReceipt, useReceiptWhatsApp } from '../../hooks/useReports';

function ActionIconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PdfIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9V4h12v5M6 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v7H6v-7Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.91-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.27.28-.46.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.06-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32Z" />
      <path d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.86.52 3.6 1.42 5.1L2 22l5.17-1.53a9.84 9.84 0 0 0 4.87 1.24h.01c5.46 0 9.89-4.43 9.89-9.89C21.94 6.43 17.5 2 12.04 2Zm0 18.08h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.07.9.9-3-.2-.31a8.2 8.2 0 0 1-1.26-4.4c0-4.53 3.68-8.21 8.21-8.21 4.53 0 8.21 3.68 8.21 8.21 0 4.53-3.68 8.14-8.3 8.14Z" />
    </svg>
  );
}

export default function ReceiptActions({ movementId, clientPhone }) {
  const [feedback, setFeedback] = useState('');
  const [printing, setPrinting] = useState(false);
  const downloadReceipt = useDownloadReceipt();
  const receiptWhatsApp = useReceiptWhatsApp();

  async function handleDownload() {
    setFeedback('');

    try {
      await downloadReceipt.mutateAsync(movementId);
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No se pudo descargar el comprobante.'));
    }
  }

  async function handlePrint() {
    setFeedback('');
    setPrinting(true);

    try {
      const blob = await reportsApi.getReceiptBlob(movementId);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No se pudo imprimir el comprobante.'));
    } finally {
      setPrinting(false);
    }
  }

  async function handleWhatsApp() {
    setFeedback('');

    try {
      const result = await receiptWhatsApp.mutateAsync(movementId);
      openWhatsApp({
        phone: result.phone || clientPhone,
        message: result.message,
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No se pudo preparar el mensaje de WhatsApp.'));
    }
  }

  const isLoading = downloadReceipt.isPending || receiptWhatsApp.isPending || printing;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-0.5">
        <ActionIconButton label="Descargar PDF" onClick={handleDownload} disabled={isLoading}>
          <PdfIcon />
        </ActionIconButton>
        <ActionIconButton label="Imprimir" onClick={handlePrint} disabled={isLoading}>
          <PrintIcon />
        </ActionIconButton>
        <ActionIconButton label="Enviar por WhatsApp" onClick={handleWhatsApp} disabled={isLoading}>
          <WhatsAppIcon />
        </ActionIconButton>
      </div>
      {feedback ? <p className="max-w-[10rem] text-right text-[11px] leading-tight text-danger">{feedback}</p> : null}
    </div>
  );
}
