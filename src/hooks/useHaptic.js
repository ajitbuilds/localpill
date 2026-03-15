/**
 * useHaptic — Haptic feedback via navigator.vibrate()
 * Issue #24: Haptic feedback on key user actions
 *
 * Usage:  const haptic = useHaptic();
 *         haptic.light()   — single short tap (selection)
 *         haptic.medium()  — medium single tap (confirm)
 *         haptic.heavy()   — long vibration (error/alert)
 *         haptic.success() — double quick tap (success)
 *         haptic.error()   — stutter pattern (error)
 */
export function useHaptic() {
    const vibrate = (pattern) => {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Silent fail — vibration not supported
        }
    };

    return {
        light: () => vibrate(30),
        medium: () => vibrate(60),
        heavy: () => vibrate(120),
        success: () => vibrate([40, 30, 80]),
        error: () => vibrate([80, 40, 80, 40, 80]),
        toggle: () => vibrate(50),
    };
}
