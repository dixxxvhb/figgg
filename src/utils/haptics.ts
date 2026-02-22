// Haptic feedback utility for native-feeling interactions on mobile
// Uses navigator.vibrate() which is supported on Android/Chrome
// Falls back silently on iOS (no vibration API) and desktop

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(durations[style]);
  }
}
