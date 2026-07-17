import Modal from './Modal';
import { Button } from './Button';

/**
 * Modal de confirmación reutilizable (reemplaza window.confirm).
 * `children` permite agregar contenido extra debajo del mensaje.
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {message ? <p className="text-sm leading-6 text-text-muted">{message}</p> : null}
      {children}
    </Modal>
  );
}
