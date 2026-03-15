import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ── User Document ──────────────────────────────────────────────────────

export interface UserDoc {
    name: string;
    phone: string;
    age?: number | null;
    gender?: string | null;
    role: 'user' | 'pharmacy' | 'admin';
    profilePicUrl?: string | null;
    profilePic?: string | null;
    isSuspended?: boolean;
    fcmToken?: string | null;
    expoPushToken?: string | null;
    createdAt?: FirebaseFirestoreTypes.Timestamp;
    updatedAt?: FirebaseFirestoreTypes.Timestamp;
}

// ── Medicine Request ───────────────────────────────────────────────────

export interface MedicineRequest {
    id: string;
    userId: string;
    typedMedicines?: string[];
    prescriptionUrl?: string | null;
    location: {
        latitude: number;
        longitude: number;
    };
    address?: string;
    searchRadiusKm: number;
    timeoutMinutes: number;
    status: 'pending' | 'matched' | 'completed' | 'cancelled' | 'expired' | 'timeout' | 'closed';
    targetPharmacyIds?: string[];
    responsesCount?: number;
    matchedPharmacyId?: string | null;
    matchedPharmacyName?: string | null;
    completedAt?: FirebaseFirestoreTypes.Timestamp;
    cancelledAt?: FirebaseFirestoreTypes.Timestamp;
    expiresAt?: FirebaseFirestoreTypes.Timestamp;
    createdAt?: FirebaseFirestoreTypes.Timestamp;
}

// ── Pharmacy Response ──────────────────────────────────────────────────

export interface PharmacyResponse {
    id: string;
    pharmacyId: string;
    pharmacyName: string;
    pharmacyProfilePic?: string | null;
    availability: 'full' | 'partial' | 'none';
    message?: string;
    priceEstimate?: number;
    respondedAt?: FirebaseFirestoreTypes.Timestamp;
}

// ── Pharmacy ───────────────────────────────────────────────────────────

export interface Pharmacy {
    id: string;
    pharmacyName?: string;
    name?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    description?: string;
    profilePic?: string | null;
    profilePicUrl?: string | null;
    isOnline?: boolean;
    isVerified?: boolean;
    isFastResponder?: boolean;
    businessHours?: string;
    openTime?: string;
    closeTime?: string;
    location?: {
        latitude?: number;
        longitude?: number;
        lat?: number;
        lng?: number;
    };
}

// ── Chat Message (RTDB) ────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    senderId: string;
    text?: string;
    type: 'text' | 'image' | 'document';
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    timestamp: number;
    reaction?: string;
    replyTo?: string;
    replyText?: string;
}

// ── Notification ───────────────────────────────────────────────────────

export interface UserNotification {
    id: string;
    title: string;
    body: string;
    type: 'PHARMACY_RESPONSE' | 'MATCH_FOUND' | 'TIMEOUT' | 'SYSTEM' | string;
    relatedId?: string;
    data?: Record<string, any>;
    isRead: boolean;
    createdAt?: FirebaseFirestoreTypes.Timestamp;
}

// ── Presence (RTDB) ────────────────────────────────────────────────────

export interface PresenceStatus {
    online: boolean;
    lastSeen: number;
}
