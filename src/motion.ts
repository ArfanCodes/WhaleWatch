// Global motion switch. Defaults ON. Can be disabled (e.g. for reduced-motion
// preference, tests, or capturing a static frame) by setting
// globalThis.__WW_MOTION = false before the screens mount.
export function motionEnabled(): boolean {
  if ((globalThis as any).__WW_MOTION === false) return false;
  try {
    // persisted override (survives web reloads) — used for static capture / reduced motion
    if (typeof localStorage !== 'undefined' && localStorage.getItem('__ww_motion') === 'off') {
      return false;
    }
  } catch {}
  return true;
}
