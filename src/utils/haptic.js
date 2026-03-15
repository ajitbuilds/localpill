/**
 * haptic.js — Tactile feedback utility (Issue #24)
 *
 * Usage:
 *   import { haptic } from '../utils/haptic';
 *   haptic('light');   // 10ms
 *   haptic('medium');  // 25ms
 *   haptic('heavy');   // 50ms
 *   haptic('success'); // [30,50,30]
 *   haptic('error');   // [50,30,50,30,50]
 */

const PATTERNS = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [30, 50, 30],
    error: [50, 30, 50, 30, 50],
    tap: 10,
    toggle: 25,
};

export function haptic(type = 'light') {
    try {
        if (!navigator?.vibrate) return;
        const pattern = PATTERNS[type] ?? PATTERNS.light;
        navigator.vibrate(pattern);
    } catch {
        // Silently ignore — not supported on all devices
    }
}

export default haptic;
