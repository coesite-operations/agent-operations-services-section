import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessAllocationReadiness as assess, planNonoverlappingAllocations as plan } from '../src/allocation-readiness.mjs';
const DATE = '2026-10-10';
const row = (i, state='obstructed', reasons=['no-current-provider-admission']) => ({scope:`task:${i}`,state,reasons,candidates:state==='allocatable'?[{character:{id:'real-carrier'}}]:[]});
const page = (cursor,items,remaining,date=DATE) => ({cursor,result:{kind:'metroplat.work.allocation-candidates',date,items,remaining,...(remaining>0?{nextCursor:cursor+items.length}:{})}});

test('complete dated coverage counts every blocked scope once and names provider gap',()=>{
 const x=assess([page(0,[row(0),row(1)],1),page(2,[row(2)],0)],{expectedDate:DATE});
 assert.equal(x.state,'NO_CURRENT_PROVIDER_ADMISSION'); assert.equal(x.observedScopes,3); assert.equal(x.reasons['no-current-provider-admission'],3);
});
test('first page is not permission to pronounce enterprise capacity zero',()=>{
 const x=assess([page(0,[row(0)],180)]);assert.equal(x.state,'INCOMPLETE'); assert.equal(x.observedScopes,1);
});
test('missing page and incorrect nextCursor are unknown',()=>{
 assert.equal(assess([page(0,[row(0)],1),page(2,[row(2)],0)]).state,'UNKNOWN');
 const x=page(0,[row(0)],1);x.result.nextCursor=3;assert.equal(assess([x]).state,'UNKNOWN');
});
test('replayed or duplicated scopes cannot increase blockage count',()=>{
 assert.equal(assess([page(0,[row(0),row(0)],0)]).state,'UNKNOWN');
});
test('one genuinely allocatable scope invalidates all-provider-blocked',()=>{
 const x=assess([page(0,[row(0),row(1,'allocatable',[])],0)]);
 assert.equal(x.state,'SOME_ALLOCATABLE');assert.equal(x.allProviderObstructed,false);
});
test('malformed and empty inputs never imply zero capacity',()=>{
 assert.equal(assess([]).state,'UNKNOWN');assert.equal(assess([{cursor:0,result:{kind:'nope',items:[],remaining:0}}]).state,'UNKNOWN');
 assert.equal(assess([page(0,[{...row(0),state:'allocatable',candidates:[]}],0)]).state,'UNKNOWN');
});
test('absence of current provider does not excuse work/skill declaration gaps',()=>{
 const x=assess([page(0,[row(0,'obstructed',['work-not-declared','skill-not-declared','no-current-provider-admission'])],0)]);
 assert.equal(x.reasons['work-not-declared'],1);assert.equal(x.reasons['skill-not-declared'],1);
});
test('181-scope pagination cannot hide ten dual work/skill gaps',()=>{
 const makeRows=(begin,n)=>Array.from({length:n},(_,j)=>{const i=begin+j;return row(i,'obstructed',i<10?['no-current-provider-admission','work-not-declared','skill-not-declared']:['no-current-provider-admission']);});
 const pages=[page(0,makeRows(0,40),141),page(40,makeRows(40,50),91),page(90,makeRows(90,50),41),page(140,makeRows(140,41),0)];
 const x=assess(pages,{expectedDate:DATE});assert.equal(x.state,'NO_CURRENT_PROVIDER_ADMISSION');assert.equal(x.observedScopes,181);
 assert.equal(x.reasons['no-current-provider-admission'],181);assert.equal(x.reasons['work-not-declared'],10);assert.equal(x.reasons['skill-not-declared'],10);
});
test('mixed dates and yesterday observations cannot masquerade as a current census',()=>{
 assert.equal(assess([page(0,[row(0)],1),page(1,[row(1)],0,'2026-10-09')]).state,'UNKNOWN');
 assert.equal(assess([page(0,[row(0)],0,'2026-10-09')],{expectedDate:DATE}).state,'UNKNOWN');
});
test('inconsistent remaining counts invalidate the entire census',()=>{
 assert.equal(assess([page(0,[row(0)],3),page(1,[row(1)],0)]).state,'UNKNOWN');
 assert.equal(assess([page(0,[row(0)],0),page(1,[row(1)],0)]).state,'UNKNOWN');
});
test('choice required and already allocated are not zero organizational capacity',()=>{
 assert.equal(assess([page(0,[row(0,'choice-required',[])],0)]).state,'CHOICE_REQUIRED');
 assert.equal(assess([page(0,[row(0,'already-allocated',[])],0)]).state,'ALREADY_ALLOCATED');
});

// These are source-level wire observations, not evidence of provider admission.
const allocation = (candidates) => ({ ...row(0, 'allocatable', []), candidates });
for (const [label, candidate] of [
  ['null', null], ['undefined', undefined], ['string', 'provider'],
  ['number', 1], ['boolean', true], ['array', []], ['nested array', [{}]],
]) {
  test(`candidate ${label} is UNKNOWN in every state`, () => {
    for (const state of ['allocatable', 'obstructed', 'choice-required', 'already-allocated']) {
      const record = { ...row(0, state, []), candidates: [candidate] };
      assert.equal(assess([page(0, [record], 0)]).state, 'UNKNOWN', state);
    }
    assert.equal(assess([page(0, [allocation([{}, candidate])], 0)]).state, 'UNKNOWN');
  });
}

test('candidate objects use the wire contract without inventing provider admission fields', () => {
  // allocation-control.mjs declares candidates.items.type = object. Its producer
  // carries office/duty/character/evidence/load/reasons, not a required provider id.
  const candidate = {
    office: 'office:example', duty: 'duty:example',
    character: { id: 'character:example', capabilities: ['example'] },
    evidence: ['witness:example'], load: [], reasons: [],
  };
  for (const value of [{}, candidate, Object.create(null)]) {
    const result = assess([page(0, [allocation([value])], 0)]);
    assert.equal(result.state, 'SOME_ALLOCATABLE');
    assert.equal(result.candidateCount, 1);
    assert.equal(result.allProviderObstructed, false);
  }
});

for (const date of [
  '2026-99-99', '2026-00-10', '2026-13-01', '2026-01-00', '2026-01-32',
  '2026-04-31', '2026-06-31', '2026-09-31', '2026-11-31', '2026-02-29',
  '2024-02-30', '1900-02-29', '2100-02-29', '2026-1-01', '26-01-01',
  '2026-10-10T00:00:00Z', '2026-10-10\n', ' 2026-10-10', '',
]) {
  test(`invalid calendar date ${JSON.stringify(date)} cannot support capacity`, () => {
    const pages = [page(0, [allocation([{}])], 0, date)];
    assert.deepEqual(assess(pages), { state: 'UNKNOWN', reasons: ['missing-or-invalid-date'] });
    assert.deepEqual(assess(pages, { expectedDate: date }), { state: 'UNKNOWN', reasons: ['invalid-expected-date'] });
    assert.deepEqual(assess([page(0, [allocation([{}])], 0)], { expectedDate: date }),
      { state: 'UNKNOWN', reasons: ['invalid-expected-date'] });
  });
}

test('calendar validation accepts leap years and real month boundaries', () => {
  for (const date of ['0000-02-29', '0099-01-01', '1900-02-28', '2000-02-29', '2024-02-29', '2026-04-30', '2026-12-31', '9999-12-31']) {
    const result = assess([page(0, [allocation([{}])], 0, date)], { expectedDate: date });
    assert.equal(result.state, 'SOME_ALLOCATABLE', date);
    assert.equal(result.observedDate, date);
  }
});

test('non-string dates cannot support capacity', () => {
  for (const date of [null, 20261010, true, {}, [], new Date('2026-10-10')]) {
    assert.equal(assess([page(0, [allocation([{}])], 0, date)]).state, 'UNKNOWN');
    assert.equal(assess([page(0, [allocation([{}])], 0)], { expectedDate: date }).state, 'UNKNOWN');
  }
  const missingDate = page(0, [allocation([{}])], 0);
  delete missingDate.result.date;
  assert.equal(assess([missingDate]).state, 'UNKNOWN');
});

const inheritedList = (value) => Object.setPrototypeOf(new Array(1),
  Object.assign(Object.create(Array.prototype), { 0: value }));
for (const [label, makeList] of [
  ['hole', () => new Array(1)],
  ['trailing hole', (value) => { const list = [value]; list.length = 2; return list; }],
  ['inherited index', inheritedList],
]) {
  test(`${label} in pages, items, reasons or candidates is UNKNOWN`, () => {
    assert.equal(assess(makeList(page(0, [allocation([{}])], 0))).state, 'UNKNOWN');
    assert.equal(assess([page(0, makeList(allocation([{}])), 0)]).state, 'UNKNOWN');
    assert.equal(assess([page(0, [{ ...row(0), reasons: makeList('no-current-provider-admission') }], 0)]).state, 'UNKNOWN');
    assert.equal(assess([page(0, [allocation(makeList({}))], 0)]).state, 'UNKNOWN');
  });
}

test('wire records are objects rather than arrays decorated with record properties', () => {
  const record = allocation([{}]);
  const observation = page(0, [record], 0);
  assert.equal(assess([Object.assign([], observation)]).state, 'UNKNOWN');
  assert.equal(assess([{ ...observation, result: Object.assign([], observation.result) }]).state, 'UNKNOWN');
  assert.equal(assess([page(0, [Object.assign([], record)], 0)]).state, 'UNKNOWN');
});

test('complete out-of-order frozen pages retain state precedence and input identity', () => {
  const freeze = (value) => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const first = page(0, [row(0, 'obstructed', ['work-not-declared', 'work-not-declared'])], 2);
  const last = page(1, [row(1, 'choice-required', []), row(2, 'already-allocated', [])], 0);
  const pages = freeze([last, first]);
  const result = assess(pages, { expectedDate: DATE });
  assert.equal(result.state, 'CHOICE_REQUIRED');
  assert.equal(result.observedScopes, 3);
  assert.equal(result.reasons['work-not-declared'], 1);
  assert.equal(result.candidateCount, 0);
  assert.equal(pages[0], last);
  assert.equal(pages[1], first);
  assert.equal(assess([page(0, [row(0, 'obstructed', ['work-not-declared'])], 0)]).state, 'NO_ALLOCATABLE_SCOPES');
});

test('package exposes the guard and enrolls its source and tests in existing commands', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.exports['./allocation-readiness'], './src/allocation-readiness.mjs');
  assert.ok(pkg.scripts.check.split(' && ').includes('node --check src/allocation-readiness.mjs'));
  assert.ok(pkg.scripts.check.split(' && ').includes('node --check test/allocation-readiness.test.mjs'));
  assert.ok(pkg.scripts.test.split(/\s+/).includes('test/allocation-readiness.test.mjs'));
  assert.equal((await import('@union-officer-academy/union-officer-academy/allocation-readiness')).assessAllocationReadiness, assess);
});

const scopeFor=(name,candidates)=>({
  scope:name,state:'allocatable',reasons:[],candidates:candidates.map(id=>
    ({office:'office:allocated',duty:'duty:qualified',
      character:{id},evidence:['witness:admitted-provider'],load:[],reasons:[]}))
});
test('alternate-path allocation increases actual possible concurrency over greedy first choice',()=>{
  // Greedy A->shared, B->shared would place only one. The lawful matching
  // reassigns A to spare capacity so the uniquely constrained B also fits.
  const pages=[page(0,[scopeFor('A',['shared','spare']),scopeFor('B',['shared'])],0)];
  const r=plan(pages,{expectedDate:DATE});
  assert.equal(r.state,'MAXIMAL_MATCHING');
  assert.equal(r.matchedCount,2);
  assert.deepEqual(r.assignments.map(x=>[x.scope,x.characterId]),[
    ['A','spare'],['B','shared']
  ]);
  assert.equal(r.executionAuthorized,false);
  assert.equal(r.independentReceivingClaimAllowed,false);
});
test('capacity competition exposes the exact unmatched demand rather than pretending unlimited agent copies',()=>{
  const r=plan([page(0,[scopeFor('A',['shared']),scopeFor('B',['shared']),scopeFor('C',['shared'])],0)],
    {expectedDate:DATE});
  assert.equal(r.state,'CAPACITY_GAP');
  assert.equal(r.qualifiedCharacterCount,1);
  assert.equal(r.matchedCount,1);
  assert.equal(r.unmatched.length,2);
  assert(r.unmatched.every(x=>x.reason==='qualified-characters-already-needed-elsewhere'));
  assert.deepEqual(r.assignments.map(x=>x.characterId),['shared']);
});
test('missing or contested candidate identity creates no allocation, even if upstream declares scope allocatable',()=>{
  const invalid={scope:'A',state:'allocatable',reasons:[],candidates:[
    {office:'office:A'}, {character:{id:' '}},
    {character:{id:'claimed'},reasons:['permission-contested']}
  ]};
  const r=plan([page(0,[invalid],0)],{expectedDate:DATE});
  assert.equal(r.state,'CAPACITY_GAP');
  assert.deepEqual(r.assignments,[]);
  assert.deepEqual(r.unidentifiedCandidateScopes,['A']);
  assert.equal(r.excludedCandidateCount,3);
});
test('census completeness, date and actual prior authorization remain necessary',()=>{
  assert.equal(plan([page(0,[scopeFor('A',['a'])],1)],{expectedDate:DATE}).state,'UNKNOWN');
  assert.equal(plan([page(0,[scopeFor('A',['a'])],0,'2026-10-09')],{expectedDate:DATE}).state,'UNKNOWN');
  assert.equal(plan([page(0,[scopeFor('A',['a'])],0)]).reason,'date-not-independently-fixed');
  const v=plan([page(0,[scopeFor('A',['a'])],0)],{expectedDate:DATE,maxScopes:0});
  assert.equal(v.state,'BOUNDED');
  assert.equal(v.executionAuthorized,false);
});
test('plan is stable under valid page permutation and candidate permutations, and does not mutate source',()=>{
  const first=page(0,[scopeFor('C',['x','y'])],2);
  const last=page(1,[scopeFor('A',['y']),scopeFor('B',['x'])],0);
  const saved=JSON.stringify([first,last]);
  const a=plan([last,first],{expectedDate:DATE});
  const b=plan([first,last],{expectedDate:DATE});
  assert.deepEqual(a.assignments,b.assignments);
  assert.equal(a.matchedCount,2);
  assert.equal(JSON.stringify([first,last]),saved);
});
test('Hall deficiency is an explicit market/supply hole not an invented job allocation',()=>{
  const r=plan([page(0,[scopeFor('A',['shared']),scopeFor('B',['shared'])],0)],
    {expectedDate:DATE});
  assert.equal(r.state,'CAPACITY_GAP');
  assert.deepEqual(r.hallDeficiency.demandingScopes,['A','B']);
  assert.deepEqual(r.hallDeficiency.eligibleCharacters,['shared']);
  assert.equal(r.hallDeficiency.deficit,1);
  assert.equal(r.hallDeficiency.marketPurchaseAuthorized,false);
  assert.equal(r.hallDeficiency.receivingStatus,'source-verified-by-caller-not-market-supplied');
  assert.equal(r.hallDeficiency.kind,'hall-deficiency-witness');
});
test('Hall shortage exposes all unmatched disconnected demand, including zero-provider scopes',()=>{
  const r=plan([page(0,[scopeFor('A',['x']),scopeFor('B',['x']),scopeFor('C',[])],0)],
    {expectedDate:DATE});
  assert.equal(r.hallDeficiency.deficit,2);
  assert.deepEqual(r.hallDeficiency.demandingScopes,['A','B','C']);
  assert.deepEqual(r.hallDeficiency.eligibleCharacters,['x']);
  assert.equal(r.matchingPressure,undefined);
});
test('full matching has no Hall obstruction and keeps exact ordinary provider evidence',()=>{
  const r=plan([page(0,[scopeFor('A',['x','y']),scopeFor('B',['x'])],0)],
    {expectedDate:DATE});
  assert.equal(r.state,'MAXIMAL_MATCHING');
  assert.equal(r.hallDeficiency,null);
  assert.equal(r.unmatched.length,0);
});
test('source package exposes the maximal matching without adding a new dispatch provider',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(pkg.exports['./allocation-readiness'],'./src/allocation-readiness.mjs');
  assert.equal(typeof plan,'function');
});
