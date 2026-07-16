import { useEffect } from 'react';
import OfflineBanner from '../components/pwa/OfflineBanner';
import PwaUpdateBanner from '../components/pwa/PwaUpdateBanner';
import { setupPwa } from '../lib/pwa';

export default function PwaBootstrap({ children }) {
  useEffect(() => {
    setupPwa().catch(() => {});
  }, []);

  return (
    <>
      <PwaUpdateBanner />
      <OfflineBanner />
      {children}
    </>
  );
}
