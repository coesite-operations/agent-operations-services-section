import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAllocationReadiness as assess } from '../src/allocation-readiness.mjs';
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
