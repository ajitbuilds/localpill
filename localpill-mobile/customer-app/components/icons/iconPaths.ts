/**
 * LocalPill Custom SVG Icon Paths
 * All paths designed for 24x24 viewBox, stroke-based (line style)
 * Inspired by Lucide/Phosphor for a clean, professional look
 */

export type IconName =
  // Navigation
  | 'arrow-back'
  | 'arrow-forward'
  | 'arrow-forward-circle'
  | 'chevron-forward'
  | 'chevron-back'
  | 'chevron-down'
  | 'chevron-up'
  | 'close'
  | 'expand-outline'
  | 'open-outline'
  // Actions
  | 'search'
  | 'search-outline'
  | 'add-circle'
  | 'add-circle-outline'
  | 'close-circle'
  | 'send'
  | 'camera'
  | 'checkmark'
  | 'checkmark-circle'
  | 'refresh'
  | 'trash-outline'
  | 'log-out-outline'
  | 'paper-plane'
  // Communication
  | 'chatbubble'
  | 'chatbubble-ellipses'
  | 'chatbubbles-outline'
  | 'call'
  | 'call-outline'
  | 'mail'
  | 'mail-outline'
  | 'navigate'
  | 'navigate-outline'
  | 'share-outline'
  | 'arrow-undo'
  // Medical
  | 'medkit'
  | 'medkit-outline'
  | 'medical'
  | 'document-attach'
  | 'document-attach-outline'
  | 'document-text'
  | 'pricetag'
  | 'pricetag-outline'
  | 'cart-outline'
  // Location
  | 'location'
  | 'location-outline'
  | 'locate'
  | 'map'
  | 'map-outline'
  | 'globe-outline'
  // Status
  | 'shield-checkmark'
  | 'shield-checkmark-outline'
  | 'alert-circle'
  | 'alert-circle-outline'
  | 'lock-closed'
  | 'ban'
  | 'flash'
  | 'flash-outline'
  | 'star'
  | 'information-circle-outline'
  // User
  | 'person'
  | 'person-add'
  | 'person-circle-outline'
  | 'person-outline'
  // Time
  | 'time'
  | 'time-outline'
  | 'timer-outline'
  | 'calendar-outline'
  // Transport
  | 'bicycle'
  | 'bicycle-outline'
  | 'rocket'
  // Info/UI
  | 'settings-outline'
  | 'notifications-outline'
  | 'storefront'
  | 'heart'
  | 'list'
  | 'image-outline'
  | 'card-outline'
  // Social
  | 'logo-whatsapp'
  // Misc
  | 'headset-outline'
  | 'alarm'
  | 'cloud-upload'
  | 'home'
  | 'home-outline'
  | 'star-outline'
  | 'document-outline'
  | 'help-circle-outline'
  | 'gift-outline'
  | 'logo-linkedin'
  | 'logo-instagram'
  | 'logo-facebook'
  | 'logo-twitter'
  | 'logo-google'
  | 'checkmark-circle-outline';

interface IconDef {
  /** stroke-based paths */
  paths?: string[];
  /** fill-based paths (no stroke) */
  fills?: string[];
  /** viewBox — default "0 0 24 24" */
  viewBox?: string;
  /** If true, this icon uses fill instead of stroke */
  isFilled?: boolean;
}

/**
 * Each icon is defined with SVG path(s) for a 24x24 viewBox.
 * Most are stroke-based for the clean line look.
 * Some (like social logos) use fill.
 */
export const ICON_PATHS: Record<IconName, IconDef> = {
  // ─── Navigation ────────────────────────────────────────────────────────────
  'arrow-back': {
    paths: ['M19 12H5', 'M12 19l-7-7 7-7'],
  },
  'arrow-forward': {
    paths: ['M5 12h14', 'M12 5l7 7-7 7'],
  },
  'arrow-forward-circle': {
    paths: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 16l4-4-4-4', 'M8 12h8'],
  },
  'chevron-forward': {
    paths: ['M9 18l6-6-6-6'],
  },
  'chevron-back': {
    paths: ['M15 18l-6-6 6-6'],
  },
  'chevron-down': {
    paths: ['M6 9l6 6 6-6'],
  },
  'chevron-up': {
    paths: ['M18 15l-6-6-6 6'],
  },
  'close': {
    paths: ['M18 6L6 18', 'M6 6l12 12'],
  },
  'expand-outline': {
    paths: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  },
  'open-outline': {
    paths: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14L21 3'],
  },

  // ─── Actions ───────────────────────────────────────────────────────────────
  'search': {
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  },
  'search-outline': {
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  },
  'add-circle': {
    paths: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v8', 'M8 12h8'],
  },
  'add-circle-outline': {
    paths: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v8', 'M8 12h8'],
  },
  'close-circle': {
    paths: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M15 9l-6 6', 'M9 9l6 6'],
  },
  'send': {
    paths: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  },
  'camera': {
    paths: ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  },
  'checkmark': {
    paths: ['M20 6L9 17l-5-5'],
  },
  'checkmark-circle': {
    paths: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4L12 14.01l-3-3'],
  },
  'refresh': {
    paths: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M20.49 15a9 9 0 0 1-14.85 3.36L1 14'],
  },
  'trash-outline': {
    paths: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  },
  'log-out-outline': {
    paths: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  },
  'paper-plane': {
    paths: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  },

  // ─── Communication ─────────────────────────────────────────────────────────
  'chatbubble': {
    paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  },
  'chatbubble-ellipses': {
    paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
    fills: ['M8 10h.01', 'M12 10h.01', 'M16 10h.01'],
  },
  'chatbubbles-outline': {
    paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  },
  'call': {
    paths: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'],
  },
  'call-outline': {
    paths: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'],
  },
  'mail': {
    paths: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  },
  'mail-outline': {
    paths: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  },
  'navigate': {
    paths: ['M3 11l19-9-9 19-2-8-8-2z'],
  },
  'navigate-outline': {
    paths: ['M3 11l19-9-9 19-2-8-8-2z'],
  },
  'share-outline': {
    paths: ['M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M8.59 13.51l6.83 3.98', 'M15.41 6.51l-6.82 3.98'],
  },
  'arrow-undo': {
    paths: ['M3 10h10a5 5 0 0 1 0 10H3', 'M7 14l-4-4 4-4'],
  },

  // ─── Medical ───────────────────────────────────────────────────────────────
  'medkit': {
    paths: ['M19 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z', 'M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2', 'M12 11v6', 'M9 14h6'],
  },
  'medkit-outline': {
    paths: ['M19 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z', 'M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2', 'M12 11v6', 'M9 14h6'],
  },
  'medical': {
    paths: ['M12 2v8', 'M12 14v8', 'M2 12h8', 'M14 12h8'],
  },
  'document-attach': {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'M9 15h6'],
  },
  'document-attach-outline': {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'M9 15h6'],
  },
  'document-text': {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  },
  'pricetag': {
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  },
  'pricetag-outline': {
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  },
  'cart-outline': {
    paths: ['M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6'],
    fills: ['M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  },

  // ─── Location ──────────────────────────────────────────────────────────────
  'location': {
    paths: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'],
    fills: ['M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  },
  'location-outline': {
    paths: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  },
  'locate': {
    paths: ['M12 2v4', 'M12 18v4', 'M2 12h4', 'M18 12h4', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  },
  'map': {
    paths: ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z', 'M8 2v16', 'M16 6v16'],
  },
  'map-outline': {
    paths: ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z', 'M8 2v16', 'M16 6v16'],
  },
  'globe-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  },

  // ─── Status ────────────────────────────────────────────────────────────────
  'shield-checkmark': {
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  },
  'shield-checkmark-outline': {
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  },
  'alert-circle': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01'],
  },
  'alert-circle-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01'],
  },
  'lock-closed': {
    paths: ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  },
  'ban': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M4.93 4.93l14.14 14.14'],
  },
  'flash': {
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },
  'flash-outline': {
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },
  'star': {
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  'information-circle-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  },

  // ─── User ──────────────────────────────────────────────────────────────────
  'person': {
    paths: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  },
  'person-add': {
    paths: ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M20 8v6', 'M23 11h-6'],
  },
  'person-circle-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M18 19c0-2.21-2.69-4-6-4s-6 1.79-6 4', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  },
  'person-outline': {
    paths: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  },

  // ─── Time ──────────────────────────────────────────────────────────────────
  'time': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  },
  'time-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  },
  'timer-outline': {
    paths: ['M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v4l3 3', 'M12 1v3', 'M5.64 5.64l1.41 1.41'],
  },
  'calendar-outline': {
    paths: ['M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  },

  // ─── Transport ─────────────────────────────────────────────────────────────
  'bicycle': {
    paths: ['M5 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M19 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M5 15l4-8h4l2 4h4', 'M14 7h2'],
  },
  'bicycle-outline': {
    paths: ['M5 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M19 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M5 15l4-8h4l2 4h4', 'M14 7h2'],
  },
  'rocket': {
    paths: ['M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z', 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z', 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'],
  },

  // ─── Info/UI ───────────────────────────────────────────────────────────────
  'settings-outline': {
    paths: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  },
  'notifications-outline': {
    paths: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  },
  'storefront': {
    paths: ['M3 9l1-4h16l1 4', 'M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9', 'M3 9h18', 'M9 21V13h6v8'],
  },
  'heart': {
    paths: ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  },
  'list': {
    paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  },
  'image-outline': {
    paths: ['M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z', 'M21 15l-5-5L5 21'],
    fills: ['M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  },
  'card-outline': {
    paths: ['M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M1 10h22'],
  },

  // ─── Social ────────────────────────────────────────────────────────────────
  'logo-whatsapp': {
    fills: ['M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15s-.767.966-.94 1.164-.347.223-.644.075-1.255-.462-2.39-1.475-.883-1.001-1.233-1.628c-.156-.292-.004-.45.117-.596.108-.13.243-.34.365-.508.122-.168.162-.288.243-.48.081-.192.041-.36-.02-.508-.061-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.641 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z'],
    isFilled: true,
  },

  // ─── Misc ──────────────────────────────────────────────────────────────────
  'headset-outline': {
    paths: ['M3 18v-6a9 9 0 0 1 18 0v6', 'M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z', 'M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z'],
  },
  'alarm': {
    paths: ['M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v4l3 3', 'M5 3L2 6', 'M22 6l-3-3'],
  },
  'cloud-upload': {
    paths: ['M16 16l-4-4-4 4', 'M12 12v9', 'M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3'],
  },
  'home': {
    paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  },
  'home-outline': {
    paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  },
  'star-outline': {
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  'document-outline': {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  },
  'help-circle-outline': {
    paths: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  },
  'gift-outline': {
    paths: ['M20 12v10H4V12', 'M2 7h20v5H2z', 'M12 22V7', 'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z', 'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'],
  },
  'logo-linkedin': {
    fills: ['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z'],
    paths: ['M2 9h4v12H2z'],
    isFilled: true,
  },
  'logo-instagram': {
    paths: ['M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5z', 'M16 11.37a4 4 0 1 1-7.914 1.174A4 4 0 0 1 16 11.37z', 'M17.5 6.5h.01'],
  },
  'logo-facebook': {
    fills: ['M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'],
    isFilled: true,
  },
  'logo-twitter': {
    fills: ['M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5 0-.279-.028-.556-.08-.83A7.72 7.72 0 0 0 23 3z'],
    isFilled: true,
  },
  'logo-google': {
    fills: ['M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z', 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'],
    isFilled: true,
  },
  'checkmark-circle-outline': {
    paths: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4L12 14.01l-3-3'],
  },
};
