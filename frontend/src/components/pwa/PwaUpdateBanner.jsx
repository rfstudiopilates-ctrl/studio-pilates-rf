import { Button } from '../ui/Button';
import { usePwaUpdate } from '../../hooks/usePwa';

export default function PwaUpdateBanner() {
  const { updateAvailable, applying, applyUpdate, error } = usePwaUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-brand-200 bg-brand-50 px-4 py-2">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-center text-sm text-text sm:text-left">
          Hay una nueva versión de la app lista para usar.
          {error ? ` ${error}` : ''}
        </p>
        <Button
          className="h-9 px-4 text-xs"
          onClick={applyUpdate}
          disabled={applying}
          isLoading={applying}
        >
          Actualizar ahora
        </Button>
      </div>
    </div>
  );
}
