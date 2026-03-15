export interface Message {
    id: string;
    senderId: string;
    senderType?: 'customer' | 'pharmacy';
    text?: string;
    type?: 'text' | 'image' | 'document' | 'prescription_request';
    imageUri?: string;
    fileUrl?: string;
    fileName?: string;
    timestamp: number;
    status?: 'sent' | 'delivered' | 'read';
    reactions?: Record<string, string>;
    replyTo?: {
        id: string;
        text?: string;
        senderId: string;
    };
}

export interface ChatMember {
    name: string;
    online?: boolean;
    lastSeen?: number;
    typing?: boolean;
}
