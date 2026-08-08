import { useState, useEffect } from 'react';
import { detectDevicePlatform, getDeferredInstallPrompt, clearDeferredInstallPrompt, DevicePlatform } from '../utils/pwaUtils';
import { toast } from 'sonner';

export function usePWA() {
  const [platform, setPlatform] = useState<DevicePlatform>({
    isAndroid: false,
    isIOS: false,
    isDesktop: true,
    isStandalone: false
  });

  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    // 1. Detect platform
    const currentPlatform = detectDevicePlatform();
    setPlatform(currentPlatform);

    // 2. Register Service Worker & handle auto-update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        setSwRegistration(registration);

        // Check for updates periodically (every 45s) and on focus
        const updateCheckInterval = setInterval(() => {
          registration.update().catch(() => {});
        }, 45000);

        const onFocus = () => {
          registration.update().catch(() => {});
        };

        window.addEventListener('focus', onFocus);
        window.addEventListener('online', onFocus);

        // Listen for new service worker waiting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New update installed! Available on next launch.');
                setIsUpdateAvailable(true);
                toast.info('A new update is available. It will be applied the next time you open the app, or you can refresh manually.', { duration: 6000 });
              }
            });
          }
        });

        return () => {
          clearInterval(updateCheckInterval);
          window.removeEventListener('focus', onFocus);
          window.removeEventListener('online', onFocus);
        };
      }).catch((err) => {
        console.warn('[PWA] SW registration failed:', err);
      });
    }

    // 3. Backend version polling for instant version change detection
    let initialVersion: string | null = null;
    const checkServerVersion = async () => {
      try {
        const res = await fetch('/api/pwa/version');
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            if (!initialVersion) {
              initialVersion = data.version;
              setCurrentVersion(data.version);
            } else if (initialVersion !== data.version) {
              console.log(`[PWA] Server version update detected (${initialVersion} -> ${data.version}).`);
              toast.info('New app version detected. You can refresh manually to apply the changes.', { duration: 6000 });
            }
          }
        }
      } catch (e) {
        // Ignore fetch errors during offline
      }
    };

    checkServerVersion();
    const versionInterval = setInterval(checkServerVersion, 60000);

    // 4. Android 2-second install notification logic
    // Prompt appears ONLY after 2 seconds on Android (NOT on Desktop and NOT on iOS)
    let promptTimer: NodeJS.Timeout | null = null;
    const sessionDismissed = sessionStorage.getItem('nexus_pwa_prompt_dismissed');

    if (currentPlatform.isAndroid && !currentPlatform.isStandalone && !sessionDismissed) {
      promptTimer = setTimeout(() => {
        setShowAndroidPrompt(true);
      }, 2000);
    }

    return () => {
      clearInterval(versionInterval);
      if (promptTimer) clearTimeout(promptTimer);
    };
  }, []);

  // Auto-dismiss the Android install pop up notification after 5 seconds
  useEffect(() => {
    if (showAndroidPrompt) {
      const autoDismissTimer = setTimeout(() => {
        setShowAndroidPrompt(false);
      }, 5000);
      return () => clearTimeout(autoDismissTimer);
    }
  }, [showAndroidPrompt]);

  // Trigger Android native prompt
  const handleInstallAndroid = async () => {
    const deferredPrompt = getDeferredInstallPrompt();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('Nexus Trading Terminal installed on your Android device!');
      }
      clearDeferredInstallPrompt();
    } else {
      toast.info('To install: Tap browser menu (⋮) -> Select "Add to Home screen" or "Install App"');
    }
    setShowAndroidPrompt(false);
  };

  const handleDismissAndroidPrompt = () => {
    setShowAndroidPrompt(false);
    sessionStorage.setItem('nexus_pwa_prompt_dismissed', 'true');
  };

  return {
    platform,
    showAndroidPrompt,
    showIOSGuide,
    setShowIOSGuide,
    handleInstallAndroid,
    handleDismissAndroidPrompt,
    isUpdateAvailable,
    currentVersion
  };
}
