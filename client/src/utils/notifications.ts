let titleFlashInterval: any = null;
let originalTitle = typeof document !== 'undefined' ? document.title : 'MenuMint';

/**
 * Synthesizes a celebratory tri-tone chime using Web Audio API (zero external assets)
 */
export function playOrderReadyChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.48);
    });
  } catch {
    // Graceful fallback if user hasn't interacted or audio is locked
  }
}

/**
 * Synthesizes a punchy tactile bump sound for KDS bump bar actions (CP-43)
 */
export function playBumpSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    // Graceful fallback
  }
}

/**
 * Alternates the document title to attract customer's attention when in background tab
 */
export function flashTabTitle(alertTitle: string, defaultTitle?: string): void {
  if (typeof document === 'undefined') return;

  if (defaultTitle) {
    originalTitle = defaultTitle;
  } else if (!titleFlashInterval) {
    originalTitle = document.title;
  }

  stopFlashingTabTitle();

  let state = false;
  titleFlashInterval = setInterval(() => {
    document.title = state ? alertTitle : `🎉 Fresh from Kitchen!`;
    state = !state;
  }, 1000);

  // Restore title when user refocuses the tab
  const handleFocus = () => {
    stopFlashingTabTitle();
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('visibilitychange', handleVisibility);
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      stopFlashingTabTitle();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
    }
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('visibilitychange', handleVisibility);
}

export function stopFlashingTabTitle(): void {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }
  if (typeof document !== 'undefined' && originalTitle) {
    document.title = originalTitle;
  }
}

/**
 * Requests native browser push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Sends a native system notification if permitted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

