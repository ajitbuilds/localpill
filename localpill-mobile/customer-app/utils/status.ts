/**
 * Shared status config utility — extracted from index.tsx and history.tsx
 */

export type StatusConfig = {
    label: string;
    dotColor: string;
    bgColor: string;
    textColor: string;
    icon: any;
};

/** Used in Dashboard (index.tsx) — includes responsesCount */
export function getRequestStatusConfig(status: string, responsesCount: number, activeColors: any): StatusConfig {
    if (status === 'cancelled')
        return { label: 'Cancelled', dotColor: activeColors.danger, bgColor: activeColors.dangerSoft, textColor: activeColors.danger, icon: 'close' };
    if (status === 'completed')
        return { label: 'Completed', dotColor: activeColors.success, bgColor: activeColors.successSoft, textColor: activeColors.success, icon: 'checkmark' };
    if (status === 'matched' || responsesCount > 0)
        return { label: `${responsesCount} Match${responsesCount !== 1 ? 'es' : ''}`, dotColor: activeColors.success, bgColor: activeColors.successSoft, textColor: activeColors.success, icon: 'checkmark' };
    if (status === 'expired' || status === 'timeout' || status === 'closed')
        return { label: 'Expired', dotColor: activeColors.textMuted, bgColor: activeColors.background, textColor: activeColors.textMuted, icon: 'alarm-outline' };
    if (status === 'pending')
        return { label: 'Searching…', dotColor: activeColors.warning, bgColor: activeColors.warningSoft, textColor: activeColors.warning, icon: 'radio-button-on' };
    return { label: 'Active', dotColor: activeColors.accent, bgColor: activeColors.accentSoft, textColor: activeColors.accent, icon: 'ellipse' };
}

/** Used in History (history.tsx) — simpler label-only version */
export function getHistoryStatusConfig(status: string, activeColors: any) {
    switch (status) {
        case 'completed': return { label: 'COMPLETED', bg: activeColors.successSoft, color: activeColors.success, dot: activeColors.success, icon: '✓' };
        case 'matched': return { label: 'MATCHED', bg: activeColors.accentSoft, color: activeColors.accent, dot: activeColors.accent, icon: '✓' };
        case 'cancelled': return { label: 'CANCELLED', bg: activeColors.dangerSoft, color: activeColors.danger, dot: activeColors.danger, icon: '✕' };
        case 'expired':
        case 'timeout':
        case 'closed': return { label: 'EXPIRED', bg: activeColors.background, color: activeColors.textMuted, dot: activeColors.textMuted, icon: '⏰' };
        case 'pending': return { label: 'SEARCHING', bg: activeColors.warningSoft, color: activeColors.warning, dot: activeColors.warning, icon: '◎' };
        default: return { label: 'ACTIVE', bg: activeColors.accentSoft, color: activeColors.accent, dot: activeColors.accent, icon: '●' };
    }
}
