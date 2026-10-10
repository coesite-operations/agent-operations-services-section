/** Validate all pages of a dated MetroPlat allocation census before asserting capacity.
 * This never authorizes, allocates, seats, or dispatches a worker.
 * Each page's cursor is the one sent by the caller; the wire response does not echo it.
 */
const STATES = new Set(['allocatable', 'choice-required', 'obstructed', 'already-allocated']);
const error = (why) => Object.freeze({ state: 'UNKNOWN', reasons: [why] });
export function assessAllocationReadiness(pages, { expectedDate } = {}) {
  if (!Array.isArray(pages) || pages.length === 0) return error('no-pages');
  if (expectedDate !== undefined && (typeof expectedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expectedDate))) return error('invalid-expected-date');
  const sorted = [...pages].sort((a, b) => a?.cursor - b?.cursor);
  let at = 0, total, observedDate;
  const states = Object.create(null), reasons = Object.create(null), seen = new Set();
  let candidateCount = 0;
  for (const [index, page] of sorted.entries()) {
    const { cursor, result } = page ?? {};
    if (!Number.isSafeInteger(cursor) || cursor !== at || result?.kind !== 'metroplat.work.allocation-candidates'
      || !Array.isArray(result.items) || result.items.length === 0) return error('invalid-or-noncontiguous-page');
    if (typeof result.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(result.date)) return error('missing-or-invalid-date');
    if (observedDate === undefined) observedDate = result.date;
    if (result.date !== observedDate || (expectedDate !== undefined && result.date !== expectedDate)) return error('mixed-or-stale-observation-dates');
    if (!Number.isSafeInteger(result.remaining) || result.remaining < 0) return error('remaining-invalid');
    const next = at + result.items.length;
    if (total === undefined) total = next + result.remaining;
    if (next + result.remaining !== total) return error('inconsistent-remaining-total');
    if (result.remaining > 0 && result.nextCursor !== next) return error('next-cursor-mismatch');
    if (result.remaining === 0 && result.nextCursor !== undefined) return error('unexpected-final-cursor');
    if (result.remaining === 0 && index !== sorted.length - 1) return error('trailing-pages-after-final');
    for (const row of result.items) {
      if (typeof row?.scope !== 'string' || row.scope.length === 0 || seen.has(row.scope)
        || !STATES.has(row.state) || !Array.isArray(row.reasons) || !row.reasons.every((x) => typeof x === 'string')
        || !Array.isArray(row.candidates) || (row.state === 'allocatable' && row.candidates.length === 0)) {
        return error('invalid-or-duplicate-allocation-record');
      }
      seen.add(row.scope);
      states[row.state] = (states[row.state] ?? 0) + 1;
      for (const reason of new Set(row.reasons)) reasons[reason] = (reasons[reason] ?? 0) + 1;
      candidateCount += row.candidates.length;
    }
    at = next;
  }
  const remaining = sorted.at(-1).result.remaining;
  if (remaining !== 0) return Object.freeze({ state: 'INCOMPLETE', observedDate, observedScopes: at, remaining, reasons: ['more-pages-unread'] });
  const blocked = states.obstructed ?? 0, allocatable = states.allocatable ?? 0;
  const allProviderObstructed = blocked === at && reasons['no-current-provider-admission'] === at;
  const state = allProviderObstructed ? 'NO_CURRENT_PROVIDER_ADMISSION' : allocatable > 0 ? 'SOME_ALLOCATABLE' :
    (states['choice-required'] ?? 0) > 0 ? 'CHOICE_REQUIRED' :
    (states['already-allocated'] ?? 0) > 0 ? 'ALREADY_ALLOCATED' : 'NO_ALLOCATABLE_SCOPES';
  return Object.freeze({ state, observedDate, observedScopes: at, blocked, allocatable, candidateCount,
    states: Object.freeze({ ...states }), reasons: Object.freeze({ ...reasons }), allProviderObstructed });
}
