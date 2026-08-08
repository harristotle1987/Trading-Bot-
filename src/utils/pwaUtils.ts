export interface DevicePlatform {
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isStandalone: boolean;
}

export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isAndroid: false, isIOS: false, isDesktop: true, isStandalone: false };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isDesktop = !isAndroid && !isIOS;

  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  return { isAndroid, isIOS, isDesktop, isStandalone };
}

// Global variable to store beforeinstallprompt event
let deferredInstallPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar on Android
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null;
}
