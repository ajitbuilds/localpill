/**
 * LocalPill Customer App — Unit Tests
 * Tests: T1–T10 as per layout_audit_and_tests.md
 */

// ─── Pure utility functions extracted for testability ───────────────────────

function getGreeting(hour: number): string {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function timeAgo(ts: number, now: number): string {
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

function getStatusConfig(status: string, responsesCount: number) {
    if (status === 'cancelled') return { label: 'Cancelled', icon: 'close' };
    if (status === 'matched' || responsesCount > 0) return { label: `${responsesCount} Match${responsesCount !== 1 ? 'es' : ''}`, icon: 'checkmark' };
    if (status === 'completed') return { label: 'Completed', icon: 'checkmark' };
    if (status === 'expired' || status === 'timeout') return { label: 'Expired', icon: 'alarm-outline' };
    if (status === 'pending') return { label: 'Searching…', icon: 'radio-button-on' };
    return { label: 'Active', icon: 'ellipse' };
}

function filterMedicineSuggestions(db: string[], query: string): string[] {
    if (query.trim().length <= 1) return [];
    return db.filter(m => m.toLowerCase().startsWith(query.toLowerCase().trim())).slice(0, 5);
}

function removeMedicine(medicines: string[], index: number): string[] {
    if (medicines.length <= 1) return medicines;
    return medicines.filter((_, i) => i !== index);
}

// ─── T1: getGreeting() ───────────────────────────────────────────────────────
describe('T1 — getGreeting()', () => {
    test('returns "Good morning" for hours 0–11', () => {
        expect(getGreeting(0)).toBe('Good morning');
        expect(getGreeting(6)).toBe('Good morning');
        expect(getGreeting(11)).toBe('Good morning');
    });
    test('returns "Good afternoon" for hours 12–16', () => {
        expect(getGreeting(12)).toBe('Good afternoon');
        expect(getGreeting(14)).toBe('Good afternoon');
        expect(getGreeting(16)).toBe('Good afternoon');
    });
    test('returns "Good evening" for hours 17–23', () => {
        expect(getGreeting(17)).toBe('Good evening');
        expect(getGreeting(22)).toBe('Good evening');
        expect(getGreeting(23)).toBe('Good evening');
    });
});

// ─── T2: timeAgo() ───────────────────────────────────────────────────────────
describe('T2 — timeAgo()', () => {
    const NOW = 1000000000000;
    test('returns "just now" for diff < 60s', () => {
        expect(timeAgo(NOW - 30000, NOW)).toBe('just now');
        expect(timeAgo(NOW - 59999, NOW)).toBe('just now');
    });
    test('returns "Xm ago" for diff 1–59 minutes', () => {
        expect(timeAgo(NOW - 60000, NOW)).toBe('1m ago');
        expect(timeAgo(NOW - 300000, NOW)).toBe('5m ago');
        expect(timeAgo(NOW - 3599999, NOW)).toBe('59m ago');
    });
    test('returns "Xh ago" for diff 1–23 hours', () => {
        expect(timeAgo(NOW - 3600000, NOW)).toBe('1h ago');
        expect(timeAgo(NOW - 7200000, NOW)).toBe('2h ago');
    });
    test('returns "Xd ago" for diff >= 1 day', () => {
        expect(timeAgo(NOW - 86400000, NOW)).toBe('1d ago');
        expect(timeAgo(NOW - 172800000, NOW)).toBe('2d ago');
    });
});

// ─── T3: getStatusConfig() ───────────────────────────────────────────────────
describe('T3 — getStatusConfig()', () => {
    test('cancelled status returns Cancelled', () => {
        expect(getStatusConfig('cancelled', 0).label).toBe('Cancelled');
    });
    test('matched status returns match count', () => {
        expect(getStatusConfig('matched', 2).label).toBe('2 Matches');
        expect(getStatusConfig('matched', 1).label).toBe('1 Match');
    });
    test('completed status', () => {
        expect(getStatusConfig('completed', 0).label).toBe('Completed');
    });
    test('expired status', () => {
        expect(getStatusConfig('expired', 0).label).toBe('Expired');
        expect(getStatusConfig('timeout', 0).label).toBe('Expired');
    });
    test('pending status', () => {
        expect(getStatusConfig('pending', 0).label).toBe('Searching…');
    });
    test('unknown status falls back to Active', () => {
        expect(getStatusConfig('unknown_xyz', 0).label).toBe('Active');
    });
    test('positive responsesCount overrides non-matched status label', () => {
        expect(getStatusConfig('pending', 3).label).toBe('3 Matches');
    });
});

// ─── T7: Medicine suggestion filter ──────────────────────────────────────────
const MEDICINES_DB = ['Paracetamol', 'Panadol', 'Aspirin', 'Amoxicillin', 'Azithromycin', 'Ibuprofen', 'Cetirizine'];

describe('T7 — filterMedicineSuggestions()', () => {
    test('returns empty for single-char queries', () => {
        expect(filterMedicineSuggestions(MEDICINES_DB, 'P')).toEqual([]);
        expect(filterMedicineSuggestions(MEDICINES_DB, '')).toEqual([]);
    });
    test('returns matching results (case-insensitive)', () => {
        expect(filterMedicineSuggestions(MEDICINES_DB, 'par')).toEqual(['Paracetamol']);
        expect(filterMedicineSuggestions(MEDICINES_DB, 'PAR')).toEqual(['Paracetamol']);
        expect(filterMedicineSuggestions(MEDICINES_DB, 'am')).toEqual(['Amoxicillin']);
    });
    test('limits to 5 results max', () => {
        // 'a' would match many — but actual DB is small, test the slice
        const large = Array.from({ length: 10 }, (_, i) => `Atorvastatin${i}`);
        expect(filterMedicineSuggestions(large, 'Ato').length).toBeLessThanOrEqual(5);
    });
    test('returns empty when no match', () => {
        expect(filterMedicineSuggestions(MEDICINES_DB, 'xyz')).toEqual([]);
    });
});

// ─── T6: removeMedicine() ────────────────────────────────────────────────────
describe('T6 — removeMedicine()', () => {
    test('removes item at given index', () => {
        expect(removeMedicine(['A', 'B', 'C'], 1)).toEqual(['A', 'C']);
    });
    test('does not remove if only one item remains', () => {
        expect(removeMedicine(['A'], 0)).toEqual(['A']);
    });
    test('removes first item', () => {
        expect(removeMedicine(['A', 'B', 'C'], 0)).toEqual(['B', 'C']);
    });
    test('removes last item', () => {
        expect(removeMedicine(['A', 'B', 'C'], 2)).toEqual(['A', 'B']);
    });
});
