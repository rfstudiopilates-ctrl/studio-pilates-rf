import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { usePwaInstall } from '../../hooks/usePwa';

export default function InstallPwaBanner({ className = '' }) {
  const {
    canInstall,
    showIosGuide,
    installed,
    loading,
    error,
    install,
    dismiss,
  } = usePwaInstall();

  if (installed) {
    return null;
  }

  if (canInstall) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-text">Instalá la app en tu dispositivo</p>
            <p className="mt-1 text-sm text-text-muted">
              Accedé más rápido, usala en pantalla completa y recibí avisos de tus clases.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={dismiss} disabled={loading}>
              Ahora no
            </Button>
            <Button onClick={install} disabled={loading}>
              {loading ? 'Instalando...' : 'Instalar app'}
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        ) : null}
      </div>
    );
  }

  if (!showIosGuide) {
    return null;
  }

  return (
    <div className={className}>
      <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium text-text">Agregá la app al inicio en iPhone / iPad</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-muted">
              <li>
                Tocá el botón Compartir{' '}
                <span className="font-medium text-text">(cuadrado con flecha ↑)</span> en Safari.
              </li>
              <li>
                Elegí <span className="font-medium text-text">Agregar a inicio</span>.
              </li>
              <li>
                Confirmá con <span className="font-medium text-text">Agregar</span>.
              </li>
            </ol>
            <p className="mt-2 text-xs text-text-muted">
              Tiene que ser Safari (no Chrome en iOS). Así queda como app a pantalla completa.
            </p>
          </div>
          <Button variant="secondary" onClick={dismiss} className="shrink-0">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
