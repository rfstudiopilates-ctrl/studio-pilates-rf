import { useCallback, useEffect, useState } from 'react';

export function useSidebar(storageKey) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem(storageKey) === '1';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  }, [storageKey]);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeMobile();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileOpen, closeMobile]);

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
  };
}
