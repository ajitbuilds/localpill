import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Report an error to Firebase Crashlytics with optional context.
 * In __DEV__ mode, also logs to console.
 * 
 * Usage:
 *   reportError(error, 'ChatScreen.handleSend');
 *   reportError(error, 'SearchScreen.handleSubmit', { requestId: '123' });
 */
export const reportError = (
    error: unknown,
    context?: string,
    attributes?: Record<string, string>
) => {
    const err = error instanceof Error ? error : new Error(String(error));

    if (__DEV__) {
        console.error(`[CrashReporter] ${context || 'Unknown'}:`, err.message);
        return; // Don't send to Crashlytics in dev
    }

    try {
        if (context) {
            crashlytics().log(`Error context: ${context}`);
        }
        if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
                crashlytics().setAttribute(key, value);
            });
        }
        crashlytics().recordError(err);
    } catch (e) {
        // Crashlytics itself failed — silently ignore
    }
};

/**
 * Set the current user ID in Crashlytics for error attribution.
 * Call on login/logout.
 */
export const setCrashUser = (uid: string | null) => {
    try {
        crashlytics().setUserId(uid || '');
    } catch (_) { }
};

/**
 * Log a non-fatal breadcrumb message to Crashlytics.
 * Useful for tracing user flow before a crash.
 */
export const logBreadcrumb = (message: string) => {
    try {
        if (!__DEV__) {
            crashlytics().log(message);
        }
    } catch (_) { }
};
