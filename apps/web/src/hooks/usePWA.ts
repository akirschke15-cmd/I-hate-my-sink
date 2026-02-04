import { useEffect, useState } from 'react';

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

export function usePWA(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    platform: 'unknown',
  });

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    let platform: PWAStatus['platform'] = 'unknown';

    if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = 'ios';
    } else if (/android/.test(userAgent)) {
      platform = 'android';
    } else if (/windows|macintosh|linux/.test(userAgent)) {
      platform = 'desktop';
    }

    // Check if PWA can be installed
    const canInstall = !isStandalone && 'BeforeInstallPromptEvent' in window;

    setStatus({
      isInstalled: isStandalone,
      isStandalone,
      canInstall,
      platform,
    });

    // Listen for app installed event
    const handleAppInstalled = () => {
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        isStandalone: true,
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return status;
}

export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isOnline(): boolean {
  return navigator.onLine;
}
