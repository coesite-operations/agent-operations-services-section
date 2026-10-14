/** Validate all pages of a dated MetroPlat allocation census before asserting capacity.
 * This never authorizes, allocates, seats, or dispatches a worker.
 * Each page's cursor is the one sent by the caller; the wire response does not echo it.
 */
const STATES = new Set(['allocatable', 'choice-required', 'obstructed', 'already-allocated']);
const error = (why) => Object.freeze({ state: 'UNKNOWN', reasons: [why] });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
// Wire lists cannot contain holes. Array.prototype.every alone skips them.
const isDenseList = (value, accepts) => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !accepts(value[index])) return false;
  }
  return true;
};
const isDate = (value) => {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
};

/**
 * A *read-only* maximum-cardinality matching of actual MetroPlat allocation
 * candidates, constrained to one simultaneous work scope per identified
 * Character. This is a bounded planning projection over the EXISTING paged
 * native census, not a new capacity ledger, office assignment, promise,
 * authorization, or statement about CPU/token/GPU headroom.
 *
 * Why it increases usable frontier: assigning the first provider to each
 * scope can starve other scopes even when a full matching exists. Augmenting
 * paths can relocate a tentative assignment to free a unique provider.
 * Refuse unqualified identities, inconsistent pages and stale dates; never
 * infer a Character id from an empty wire candidate object.
 */
export function planNonoverlappingAllocations(pages, { expectedDate, maxScopes = 4096, maxEdges = 65536 } = {}) {
  if (!isDate(expectedDate))
    return Object.freeze({kind:'metroplat.allocation-pressure-readout.v1',
      state:'UNKNOWN',reason:'date-not-independently-fixed',assignments:Object.freeze([]),
      executionAuthorized:false});
  const assay=assessAllocationReadiness(pages,{expectedDate});
  if (assay.state==='UNKNOWN' || assay.state==='INCOMPLETE')
    return Object.freeze({kind:'metroplat.allocation-pressure-readout.v1',
      state:'UNKNOWN',reason:'provider-census-not-received',assay,
      assignments:Object.freeze([]),executionAuthorized:false});
  const rows=pages.flatMap(page=>page.result.items)
    .filter(row=>row.state==='allocatable').sort((a,b)=>a.scope.localeCompare(b.scope));
  if(rows.length>maxScopes || !Number.isSafeInteger(maxScopes) || maxScopes<1 ||
     !Number.isSafeInteger(maxEdges) || maxEdges<1)
    return Object.freeze({kind:'metroplat.allocation-pressure-readout.v1',
      state:'BOUNDED',reason:'matching-size-limit',observedDate:expectedDate,
      totalAllocatableScopes:rows.length,assignments:Object.freeze([]),executionAuthorized:false});
  const edges=new Map(),unknownIdentity=[],excludedCandidateCount={n:0};
  for(const row of rows){
    const admitted=new Set();
    for(const candidate of row.candidates){
      const id=candidate?.character?.id;
      if(typeof id!=='string'||id.trim()!==id||!id||
         (candidate.reasons!==undefined && (!isDenseList(candidate.reasons,
           reason=>typeof reason==='string')||candidate.reasons.length>0))){
        excludedCandidateCount.n+=1;
        continue;
      }
      admitted.add(id);
    }
    if(admitted.size===0)unknownIdentity.push(row.scope);
    edges.set(row.scope,[...admitted].sort());
  }
  const nEdges=[...edges.values()].reduce((n,x)=>n+x.length,0);
  if(nEdges>maxEdges)
    return Object.freeze({kind:'metroplat.allocation-pressure-readout.v1',
      state:'BOUNDED',reason:'matching-edge-limit',observedDate:expectedDate,
      totalAllocatableScopes:rows.length,edgeCount:nEdges,
      assignments:Object.freeze([]),executionAuthorized:false});
  const owner=new Map(),assigned=new Map();
  // Iterative alternating-path BFS: no recursive stack exhaustion even on
  // dense enterprise frontiers. Each augmentation grows cardinality by one.
  for(const start of edges.keys()){
    if(assigned.has(start))continue;
    const queue=[start],queued=new Set([start]),visited=new Set(),fromProvider=new Map();
    let free;
    for(let index=0;index<queue.length&&free===undefined;index++){
      const scope=queue[index];
      for(const provider of edges.get(scope)){
        if(visited.has(provider))continue;
        visited.add(provider);fromProvider.set(provider,scope);
        const occupied=owner.get(provider);
        if(occupied===undefined){free=provider;break;}
        if(!queued.has(occupied)){queued.add(occupied);queue.push(occupied);}
      }
    }
    if(free!==undefined){
      let provider=free;
      while(provider!==undefined){
        const scope=fromProvider.get(provider);
        const previous=assigned.get(scope);
        assigned.set(scope,provider);owner.set(provider,scope);
        provider=previous;
      }
    }
  }
  const assignments=Object.freeze([...assigned].sort(([a],[b])=>a.localeCompare(b))
    .map(([scope,characterId])=>Object.freeze({scope,characterId,
      source:'dated-native-allocation-candidates',dispatchAuthorized:false})));
  const unmatched=Object.freeze(rows.filter(row=>!assigned.has(row.scope))
    .map(row=>Object.freeze({scope:row.scope,reason:edges.get(row.scope).length?
      'qualified-characters-already-needed-elsewhere':'no-grounded-eligible-character'})));
  return Object.freeze({
    kind:'metroplat.allocation-pressure-readout.v1',state:unmatched.length?'CAPACITY_GAP':'MAXIMAL_MATCHING',
    observedDate:expectedDate,readiness:assay.state,totalAllocatableScopes:rows.length,
    qualifiedCharacterCount:uniqueCharacterCount(edges),
    candidateEdges:nEdges,matchedCount:assignments.length,
    assignments,unmatched,unidentifiedCandidateScopes:Object.freeze(unknownIdentity),
    excludedCandidateCount:excludedCandidateCount.n,
    executionAuthorized:false,independentReceivingClaimAllowed:false
  });
}

const uniqueCharacterCount=(edges)=>new Set([...edges.values()].flat()).size;

export function assessAllocationReadiness(pages, { expectedDate } = {}) {
  if (!Array.isArray(pages) || pages.length === 0) return error('no-pages');
  if (expectedDate !== undefined && !isDate(expectedDate)) return error('invalid-expected-date');
  if (!isDenseList(pages, isObject)) return error('invalid-or-noncontiguous-page');
  const sorted = [...pages].sort((a, b) => a?.cursor - b?.cursor);
  let at = 0, total, observedDate;
  const states = Object.create(null), reasons = Object.create(null), seen = new Set();
  let candidateCount = 0;
  for (const [index, page] of sorted.entries()) {
    const { cursor, result } = page ?? {};
    if (!Number.isSafeInteger(cursor) || cursor !== at || result?.kind !== 'metroplat.work.allocation-candidates'
      || !isObject(result) || !isDenseList(result.items, isObject) || result.items.length === 0) return error('invalid-or-noncontiguous-page');
    if (!isDate(result.date)) return error('missing-or-invalid-date');
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
        || !STATES.has(row.state) || !isDenseList(row.reasons, (x) => typeof x === 'string')
        // allocation-candidates declares candidate items as objects, without
        // requiring a provider/id admission schema. Preserve that boundary.
        || !isDenseList(row.candidates, isObject) || (row.state === 'allocatable' && row.candidates.length === 0)) {
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
