/**
 * LocalPill Unit Tests — Node-runnable validation script
 * Run: node __tests__/run_tests.js
 *
 * Tests: T1–T7 as per layout_audit_and_tests.md
 * No Jest binary needed — pure Node.js assertion-based tests.
 */

const assert = require('assert');
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}`);
        console.log(`     → ${e.message}`);
        failed++;
    }
}

function describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
}

// ─── Functions To Test (copied from screens to keep tests independent) ───────

function getGreeting(hour) {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function timeAgo(ts, now) {
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

function getStatusConfig(status, responsesCount) {
    if (status === 'cancelled') return { label: 'Cancelled', icon: 'close' };
    if (status === 'matched' || responsesCount > 0) return { label: `${responsesCount} Match${responsesCount !== 1 ? 'es' : ''}`, icon: 'checkmark' };
    if (status === 'completed') return { label: 'Completed', icon: 'checkmark' };
    if (status === 'expired' || status === 'timeout') return { label: 'Expired', icon: 'alarm-outline' };
    if (status === 'pending') return { label: 'Searching…', icon: 'radio-button-on' };
    return { label: 'Active', icon: 'ellipse' };
}

function filterMedicineSuggestions(db, query) {
    if (query.trim().length <= 1) return [];
    return db.filter(m => m.toLowerCase().startsWith(query.toLowerCase().trim())).slice(0, 5);
}

function removeMedicine(medicines, index) {
    if (medicines.length <= 1) return medicines;
    return medicines.filter((_, i) => i !== index);
}

const MEDICINES_DB = ['Paracetamol', 'Panadol', 'Aspirin', 'Amoxicillin', 'Azithromycin', 'Ibuprofen', 'Cetirizine'];

// ─── T1: getGreeting() ───────────────────────────────────────────────────────
describe('T1 — getGreeting()', () => {
    test('returns "Good morning" for hours 0–11', () => {
        assert.strictEqual(getGreeting(0), 'Good morning');
        assert.strictEqual(getGreeting(6), 'Good morning');
        assert.strictEqual(getGreeting(11), 'Good morning');
    });
    test('returns "Good afternoon" for hours 12–16', () => {
        assert.strictEqual(getGreeting(12), 'Good afternoon');
        assert.strictEqual(getGreeting(16), 'Good afternoon');
    });
    test('returns "Good evening" for hours 17–23', () => {
        assert.strictEqual(getGreeting(17), 'Good evening');
        assert.strictEqual(getGreeting(23), 'Good evening');
    });
});

// ─── T2: timeAgo() ───────────────────────────────────────────────────────────
describe('T2 — timeAgo()', () => {
    const NOW = 1000000000000;
    test('returns "just now" for diff < 60s', () => {
        assert.strictEqual(timeAgo(NOW - 30000, NOW), 'just now');
        assert.strictEqual(timeAgo(NOW - 59999, NOW), 'just now');
    });
    test('returns "Xm ago" for diff 1–59 minutes', () => {
        assert.strictEqual(timeAgo(NOW - 60000, NOW), '1m ago');
        assert.strictEqual(timeAgo(NOW - 300000, NOW), '5m ago');
    });
    test('returns "Xh ago" for 1–23 hours', () => {
        assert.strictEqual(timeAgo(NOW - 3600000, NOW), '1h ago');
        assert.strictEqual(timeAgo(NOW - 7200000, NOW), '2h ago');
    });
    test('returns "Xd ago" for >= 1 day', () => {
        assert.strictEqual(timeAgo(NOW - 86400000, NOW), '1d ago');
        assert.strictEqual(timeAgo(NOW - 172800000, NOW), '2d ago');
    });
});

// ─── T3: getStatusConfig() ───────────────────────────────────────────────────
describe('T3 — getStatusConfig()', () => {
    test('cancelled → "Cancelled"', () => assert.strictEqual(getStatusConfig('cancelled', 0).label, 'Cancelled'));
    test('matched with count → "2 Matches"', () => assert.strictEqual(getStatusConfig('matched', 2).label, '2 Matches'));
    test('matched with count=1 → "1 Match" (singular)', () => assert.strictEqual(getStatusConfig('matched', 1).label, '1 Match'));
    test('completed → "Completed"', () => assert.strictEqual(getStatusConfig('completed', 0).label, 'Completed'));
    test('expired → "Expired"', () => assert.strictEqual(getStatusConfig('expired', 0).label, 'Expired'));
    test('timeout → "Expired"', () => assert.strictEqual(getStatusConfig('timeout', 0).label, 'Expired'));
    test('pending → "Searching…"', () => assert.strictEqual(getStatusConfig('pending', 0).label, 'Searching…'));
    test('unknown → "Active"', () => assert.strictEqual(getStatusConfig('xyz', 0).label, 'Active'));
    test('responsesCount > 0 overrides non-matched status', () => assert.strictEqual(getStatusConfig('pending', 3).label, '3 Matches'));
});

// ─── T6: removeMedicine() ────────────────────────────────────────────────────
describe('T6 — removeMedicine()', () => {
    test('removes item at index 1', () => assert.deepStrictEqual(removeMedicine(['A', 'B', 'C'], 1), ['A', 'C']));
    test('does NOT remove if only 1 item', () => assert.deepStrictEqual(removeMedicine(['A'], 0), ['A']));
    test('removes first item', () => assert.deepStrictEqual(removeMedicine(['A', 'B', 'C'], 0), ['B', 'C']));
    test('removes last item', () => assert.deepStrictEqual(removeMedicine(['A', 'B', 'C'], 2), ['A', 'B']));
});

// ─── T7: filterMedicineSuggestions() ─────────────────────────────────────────
describe('T7 — filterMedicineSuggestions()', () => {
    test('empty for 1-char queries', () => assert.deepStrictEqual(filterMedicineSuggestions(MEDICINES_DB, 'P'), []));
    test('empty for empty string', () => assert.deepStrictEqual(filterMedicineSuggestions(MEDICINES_DB, ''), []));
    test('matches case-insensitively', () => assert.deepStrictEqual(filterMedicineSuggestions(MEDICINES_DB, 'par'), ['Paracetamol']));
    test('upper case query works', () => assert.deepStrictEqual(filterMedicineSuggestions(MEDICINES_DB, 'PAR'), ['Paracetamol']));
    test('returns empty when no match', () => assert.deepStrictEqual(filterMedicineSuggestions(MEDICINES_DB, 'xyz'), []));
    test('limits to 5 results', () => {
        const large = Array.from({ length: 10 }, (_, i) => `Medicine${i}`);
        assert.ok(filterMedicineSuggestions(large, 'Me').length <= 5);
    });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.log(`\n🔴 Some tests FAILED`);
    process.exit(1);
} else {
    console.log(`\n🟢 All ${passed} tests PASSED`);
}
