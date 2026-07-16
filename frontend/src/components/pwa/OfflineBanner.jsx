import { useOnlineStatus } from '../../hooks/usePwa';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      Estás sin conexión. Algunas funciones pueden no estar disponibles hasta recuperar internet.
    </div>
  );
}
