import analytics from '@react-native-firebase/analytics';

/**
 * Typed analytics event helpers for key user flows.
 * Each function wraps analytics().logEvent() with proper params.
 * 
 * Usage:
 *   logLoginCompleted({ method: 'phone', isNewUser: true });
 *   logRequestCreated({ medicineCount: 3, hasPrescription: true, radiusKm: 5 });
 */

export const logLoginStarted = () => {
    analytics().logEvent('login_started', { method: 'phone' });
};

export const logLoginCompleted = (params: { isNewUser: boolean }) => {
    analytics().logEvent('login_completed', {
        method: 'phone',
        is_new_user: params.isNewUser,
    });
};

export const logRequestCreated = (params: {
    medicineCount: number;
    hasPrescription: boolean;
    radiusKm: number;
    timeoutMinutes: number;
}) => {
    analytics().logEvent('request_created', {
        medicine_count: params.medicineCount,
        has_prescription: params.hasPrescription,
        radius_km: params.radiusKm,
        timeout_minutes: params.timeoutMinutes,
    });
};

export const logPrescriptionUploaded = () => {
    analytics().logEvent('prescription_uploaded');
};

export const logChatStarted = (params: { pharmacyId: string; requestId: string }) => {
    analytics().logEvent('chat_started', {
        pharmacy_id: params.pharmacyId,
        request_id: params.requestId,
    });
};

export const logChatMessageSent = (params: { type: 'text' | 'image' | 'document' }) => {
    analytics().logEvent('chat_message_sent', { type: params.type });
};

export const logRequestCancelled = (params: { requestId: string }) => {
    analytics().logEvent('request_cancelled', { request_id: params.requestId });
};

export const logRequestCompleted = (params: { requestId: string; pharmacyId: string }) => {
    analytics().logEvent('request_completed', {
        request_id: params.requestId,
        pharmacy_id: params.pharmacyId,
    });
};

export const logSearchExpanded = (params: { requestId: string; newRadiusKm: number }) => {
    analytics().logEvent('search_expanded', {
        request_id: params.requestId,
        new_radius_km: params.newRadiusKm,
    });
};

export const logProfileUpdated = () => {
    analytics().logEvent('profile_updated');
};

export const logAccountDeleted = () => {
    analytics().logEvent('account_deleted');
};

export const logNotificationClicked = (params: { type: string }) => {
    analytics().logEvent('notification_clicked', { type: params.type });
};
