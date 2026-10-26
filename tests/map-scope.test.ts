import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSelection,compareSelected,executeScoped,planScopedQuery} from '../lib/scoped-investigation';
import {dataset} from '../lib/data';
import {emptyFilters,chatSchema} from '../lib/contracts';
import type {StructuredGenerator} from '../lib/ai';
import locations from '../data/city-locations.json';
const asOf='2026-10-26',deals=dataset(asOf);
const stub=(output:unknown)=>(async()=>output) as StructuredGenerator;
const plan={intent:'query' as const,filters:{},metric:'count' as const,dealId:null,clarification:null};
test('every source city maps to an attributed city location, with no invented per-deal coordinate',()=>{
 for(const d of deals){const location=locations[d.city as keyof typeof locations];assert.ok(location,d.city);assert.equal(location.precision,'city');assert.ok(location.lat>29&&location.lat<34);assert.ok(location.lon>34&&location.lon<36);assert.match(location.source,/geonames.org\/\d+/);}
 assert.equal(Object.keys(locations).length,18);
});
test('selection is resolved from server records; duplicates, unknown IDs and more than three rejected',()=>{
 for(const ids of [['D999999'],['D100027','D100027'],['D100001','D100002','D100003','D100004']])assert.throws(()=>resolveSelection(deals,ids),/INVALID_SELECTION/);
 assert.equal(chatSchema.safeParse({message:'השווה',selectedIds:['D100027']}).success,true);
 assert.equal(chatSchema.safeParse({message:'השווה',selectedIds:['../secrets']}).success,false);
});
test('a query with no filters still cannot escape selected records',()=>{
 const selected=resolveSelection(deals,['D100027','D100074']);
 const answer=executeScoped(selected,plan,asOf);assert.equal(answer.kind,'metric');
 if('result'in answer)assert.deepEqual(answer.result?.evidenceIds,['D100027','D100074']);
 assert.deepEqual(answer.scopeIds,['D100027','D100074']);
});
test('a selected comparison never chooses a conflicting price or per-sqm value',()=>{
 const answer=compareSelected(resolveSelection(deals,['D100017','D100027']),asOf);
 assert.equal(answer.comparison[0].price,null);assert.equal(answer.comparison[0].ppsm,null);assert.equal(answer.comparison[0].size,null);
 assert.equal(answer.comparison[1].price,3826000);assert.equal(answer.comparison[1].ppsm,38260);
 assert.ok(answer.comparison[0].notes.length);assert.equal(answer.deals.length,2);
});
test('cross-scope deal ID proposed by the model is rejected before execution',async()=>{
 const selected=resolveSelection(deals,['D100027']);
 await assert.rejects(planScopedQuery(stub({...plan,filters:emptyFilters,intent:'deal',dealId:'D100017'}),'x',[],{},selected),/SELECTION_SCOPE/);
});
test('comparison with one record requests a second record, not a fabricated comparable',async()=>{
 const selected=resolveSelection(deals,['D100027']);
 const result=await planScopedQuery(stub({...plan,filters:emptyFilters,intent:'compare'}),'השווה',[],{},selected);
 assert.equal(result.intent,'clarify');assert.throws(()=>compareSelected(selected,asOf),/INVALID_SELECTION/);
});
test('comparison filters are applied, not silently ignored to keep two rows',()=>{
 const selected=resolveSelection(deals,['D100027','D100211']);
 const answer=executeScoped(selected,{...plan,intent:'compare',filters:{parking:true}},asOf);
 assert.equal(answer.kind,'clarify');assert.ok(!('comparison'in answer));
});
